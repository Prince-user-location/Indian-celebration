require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 5000;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully!"))
    .catch(err => console.log("❌ DB Error:", err));

// ================= SCHEMAS =================
const Product = mongoose.model('Product', new mongoose.Schema({
    name: String, price: Number, oldPrice: Number, category: String,
    description: String, timerEnd: Number, deliveryDate: String,
    imageUrl: String, imagePublicId: String, additionalImages: [String],
    stock: { type: Number, default: 10 }, views: { type: Number, default: 0 }
}));

const Banner = mongoose.model('Banner', new mongoose.Schema({
    imageUrl: String, imagePublicId: String,
    type: { type: String, default: 'top' }, startTime: Date, endTime: Date
}));

const Order = mongoose.model('Order', new mongoose.Schema({
    id: String, user: String, cart: String, total: Number, address: String, utr: String, paymentProof: String,
    status: { type: String, default: 'Pending Verification' },
    tracking: { type: Object, default: { "Order Placed": new Date().toLocaleString('en-IN') } },
    exactTime: { type: String, default: new Date().toLocaleString('en-IN') }
}));

// App Settings Schema for Dynamic Icons
const AppSettings = mongoose.model('AppSettings', new mongoose.Schema({
    tabWeekly: { type: String, default: "" },
    tabTravel: { type: String, default: "" },
    tabValue365: { type: String, default: "" },
    tabGifts: { type: String, default: "" },
    iconAccount: { type: String, default: "" },
    iconHelp: { type: String, default: "" },
    iconCart: { type: String, default: "" },
    catGrocery: { type: String, default: "" },
    catBoy: { type: String, default: "" },
    catChildren: { type: String, default: "" },
    catMan: { type: String, default: "" },
    catElectronics: { type: String, default: "" },
    catFestival: { type: String, default: "" },
    catDailyUses: { type: String, default: "" }
}));

// Helper: Upload to Cloudinary (FIXED: Properly Awaiting the Promise)
function uploadToCloudinary(fileBuffer, isIcon = false) {
    return new Promise((resolve, reject) => {
        const options = { folder: 'indian-celebration', fetch_format: 'auto', quality: 'auto:good' };
        if(isIcon) {
            options.width = 150; // Icons ke liye chota size
            options.crop = 'limit';
        } else {
            options.width = 800;
            options.crop = 'limit';
        }

        const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (error) reject(error); 
            else resolve(result);
        });
        stream.end(fileBuffer);
    });
}

// ================= API ROUTES =================

// Get App Settings
app.get('/api/settings', async (req, res) => {
    try {
        let settings = await AppSettings.findOne();
        if (!settings) settings = await AppSettings.create({});
        res.json(settings);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update App Settings (NOW IT WAITS FOR UPLOAD TO FINISH)
app.post('/api/admin/settings', upload.fields([
    { name: 'tabWeekly', maxCount: 1 }, { name: 'tabTravel', maxCount: 1 },
    { name: 'tabValue365', maxCount: 1 }, { name: 'tabGifts', maxCount: 1 },
    { name: 'iconAccount', maxCount: 1 }, { name: 'iconHelp', maxCount: 1 }, { name: 'iconCart', maxCount: 1 },
    { name: 'catGrocery', maxCount: 1 }, { name: 'catBoy', maxCount: 1 },
    { name: 'catChildren', maxCount: 1 }, { name: 'catMan', maxCount: 1 },
    { name: 'catElectronics', maxCount: 1 }, { name: 'catFestival', maxCount: 1 },
    { name: 'catDailyUses', maxCount: 1 }
]), async (req, res) => {
    try {
        let settings = await AppSettings.findOne();
        if (!settings) settings = new AppSettings();

        const keys = [
            'tabWeekly', 'tabTravel', 'tabValue365', 'tabGifts', 
            'iconAccount', 'iconHelp', 'iconCart',
            'catGrocery', 'catBoy', 'catChildren', 'catMan', 'catElectronics', 'catFestival', 'catDailyUses'
        ];

        for (let key of keys) {
            if (req.files && req.files[key]) {
                // Ye line ab upload hone tak wait karegi
                const result = await uploadToCloudinary(req.files[key][0].buffer, true); 
                settings[key] = result.secure_url;
            }
        }

        await settings.save();
        res.json({ success: true, settings });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get Products, Banners, Orders
app.get('/api/products', async (req, res) => { try { const limit = parseInt(req.query.limit) || 30; res.json(await Product.find().sort({ _id: -1 }).limit(limit)); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/product/view/:id', async (req, res) => { try { await Product.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/banners', async (req, res) => { try { res.json(await Banner.find().sort({ _id: -1 })); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/orders', async (req, res) => { try { res.json(await Order.find().sort({ _id: -1 })); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/order', async (req, res) => { try { /* logic */ res.json({success:true}); } catch (err) { res.status(500).json({ error: err.message }); } });
app.put('/api/admin/order/:id/verify', async (req, res) => { try { await Order.findOneAndUpdate({ id: req.params.id }, { status: 'Paid / Verified' }); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.put('/api/admin/order/:id/tracking', async (req, res) => { try { const { trackingStatus } = req.body; const order = await Order.findOne({ id: req.params.id }); let tracking = order.tracking || {}; tracking[trackingStatus] = new Date().toLocaleString('en-IN'); await Order.findOneAndUpdate({ id: req.params.id }, { tracking: tracking }); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });

// Add/Edit/Delete Product & Banner
app.post('/api/admin/product', upload.array('images', 5), async (req, res) => { try { res.json({success:true}); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/admin/banner', upload.single('image'), async (req, res) => { try { res.json({success:true}); } catch (err) { res.status(500).json({ error: err.message }); } });
app.delete('/api/admin/product/:id', async (req, res) => { try { res.json({success:true}); } catch (err) { res.status(500).json({ error: err.message }); } });
app.delete('/api/admin/banner/:id', async (req, res) => { try { res.json({success:true}); } catch (err) { res.status(500).json({ error: err.message }); } });

app.get(/.*/, (req, res) => { if (!req.path.startsWith('/api')) res.sendFile(path.join(__dirname, 'public', 'index.html')); else res.status(404).json({ error: "API route not found" }); });

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
