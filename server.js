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
const upload = multer({ storage: storage, limits: { fileSize: 50 * 1024 * 1024 } });

app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully!"))
    .catch(err => console.log("❌ DB Error:", err));

// ================= SCHEMAS =================
const Product = mongoose.model('Product', new mongoose.Schema({
    name: String, price: Number, oldPrice: Number, category: String,
    description: String, timerEnd: Number, deliveryDate: String,
    imageUrl: String, mediaType: { type: String, default: 'image' },
    imagePublicId: String, additionalImages: [String],
    stock: { type: Number, default: 10 }, views: { type: Number, default: 0 }
}));

const Banner = mongoose.model('Banner', new mongoose.Schema({
    imageUrl: String, mediaType: { type: String, default: 'image' },
    imagePublicId: String, type: { type: String, default: 'top' }, startTime: Date, endTime: Date
}));

const Order = mongoose.model('Order', new mongoose.Schema({
    id: String, user: String, cart: String, total: Number, address: String, utr: String, paymentProof: String,
    status: { type: String, default: 'Pending Verification' },
    tracking: { type: Object, default: { "Order Placed": new Date().toLocaleString('en-IN') } },
    exactTime: { type: String, default: new Date().toLocaleString('en-IN') }
}));

// App Settings Schema (Deal Banner fields added)
const AppSettings = mongoose.model('AppSettings', new mongoose.Schema({
    offlineImg: { type: String, default: "https://cdn-icons-png.flaticon.com/512/5779/5779125.png" },
    profileBanner: { type: String, default: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=800" },
    supermoneyImg: { type: String, default: "" },
    
    // NAYA: Black Friday Deal Banner Settings
    dealBannerTitle: { type: String, default: "Black Friday Shopping" },
    dealBannerProductIds: { type: String, default: "" }, // Comma separated IDs
    
    keepShoppingTitle: { type: String, default: "Keep shopping for you" },
    keepShoppingProductIds: { type: String, default: "" },
    
    tabWeekly: { type: String, default: "" }, tabTravel: { type: String, default: "" },
    tabValue365: { type: String, default: "" }, tabGifts: { type: String, default: "" },
    iconAccount: { type: String, default: "" }, iconHelp: { type: String, default: "" }, iconCart: { type: String, default: "" },
    catGrocery: { type: String, default: "" }, catBoy: { type: String, default: "" },
    catChildren: { type: String, default: "" }, catMan: { type: String, default: "" },
    catElectronics: { type: String, default: "" }, catFestival: { type: String, default: "" }, catDailyUses: { type: String, default: "" }
}));

function uploadToCloudinary(fileBuffer, mimetype, isIcon = false) {
    return new Promise((resolve, reject) => {
        const isVideo = mimetype.startsWith('video');
        const options = { folder: 'indian-celebration', resource_type: isVideo ? 'video' : 'image' };
        if (!isVideo && !isIcon) { options.fetch_format = 'auto'; options.quality = 'auto:good'; options.width = 800; options.crop = 'limit'; } 
        else if (isIcon) { options.fetch_format = 'auto'; options.quality = 'auto:good'; options.width = 400; options.crop = 'limit'; }
        const stream = cloudinary.uploader.upload_stream(options, (error, result) => { if (error) reject(error); else resolve(result); });
        stream.end(fileBuffer);
    });
}

// ================= API ROUTES =================
app.get('/api/settings', async (req, res) => {
    try {
        let settings = await AppSettings.findOne();
        if (!settings) settings = await AppSettings.create({});
        res.json(settings);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/settings', upload.fields([
    { name: 'offlineImg', maxCount: 1 }, { name: 'profileBanner', maxCount: 1 }, { name: 'supermoneyImg', maxCount: 1 },
    { name: 'tabWeekly', maxCount: 1 }, { name: 'tabTravel', maxCount: 1 }, { name: 'tabValue365', maxCount: 1 }, { name: 'tabGifts', maxCount: 1 },
    { name: 'iconAccount', maxCount: 1 }, { name: 'iconHelp', maxCount: 1 }, { name: 'iconCart', maxCount: 1 },
    { name: 'catGrocery', maxCount: 1 }, { name: 'catBoy', maxCount: 1 }, { name: 'catChildren', maxCount: 1 }, { name: 'catMan', maxCount: 1 },
    { name: 'catElectronics', maxCount: 1 }, { name: 'catFestival', maxCount: 1 }, { name: 'catDailyUses', maxCount: 1 }
]), async (req, res) => {
    try {
        let settings = await AppSettings.findOne();
        if (!settings) settings = new AppSettings();
        
        // Text Fields for Banners
        if(req.body.dealBannerTitle) settings.dealBannerTitle = req.body.dealBannerTitle;
        if(req.body.dealBannerProductIds !== undefined) settings.dealBannerProductIds = req.body.dealBannerProductIds;
        if(req.body.keepShoppingTitle) settings.keepShoppingTitle = req.body.keepShoppingTitle;
        if(req.body.keepShoppingProductIds !== undefined) settings.keepShoppingProductIds = req.body.keepShoppingProductIds;

        const keys = ['offlineImg', 'profileBanner', 'supermoneyImg', 'tabWeekly', 'tabTravel', 'tabValue365', 'tabGifts', 'iconAccount', 'iconHelp', 'iconCart', 'catGrocery', 'catBoy', 'catChildren', 'catMan', 'catElectronics', 'catFestival', 'catDailyUses'];
        
        for (let key of keys) {
            if (req.files && req.files[key]) {
                const result = await uploadToCloudinary(req.files[key][0].buffer, req.files[key][0].mimetype, true);
                settings[key] = result.secure_url;
            }
        }
        await settings.save();
        res.json({ success: true, settings });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/products', async (req, res) => {
    try { const limit = parseInt(req.query.limit) || 50; res.json(await Product.find().sort({ _id: -1 }).limit(limit)); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/banners', async (req, res) => {
    try { res.json(await Banner.find().sort({ _id: -1 })); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/orders', async (req, res) => {
    try { res.json(await Order.find().sort({ _id: -1 })); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/order', async (req, res) => {
    try {
        const { user, cart, total, address, utr, paymentProof } = req.body;
        const orderId = "ORD-" + Math.floor(100000 + Math.random() * 900000);
        const newOrder = new Order({ id: orderId, user, cart, total, address, utr, paymentProof });
        await newOrder.save();
        const parsedCart = JSON.parse(cart);
        for (let item of parsedCart) { await Product.findByIdAndUpdate(item._id, { $inc: { stock: -item.qty } }); }
        res.json({ success: true, orderId: orderId });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/admin/product', upload.array('images', 5), async (req, res) => {
    try {
        const { name, price, oldPrice, category, description, timerHours, deliveryDate, stock } = req.body;
        let images = []; let mainMediaType = 'image';
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i];
                const result = await uploadToCloudinary(file.buffer, file.mimetype, false);
                images.push({ url: result.secure_url, public_id: result.public_id });
                if(i === 0 && file.mimetype.startsWith('video')) mainMediaType = 'video';
            }
        }
        let timerEnd = (timerHours && timerHours > 0) ? Date.now() + (timerHours * 60 * 60 * 1000) : null;
        const newProduct = new Product({ name, price, oldPrice, category, description, deliveryDate, stock, imageUrl: images[0]?.url, mediaType: mainMediaType, imagePublicId: images[0]?.public_id, additionalImages: images.slice(1).map(img => img.url), timerEnd: timerEnd });
        await newProduct.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/banner', upload.single('image'), async (req, res) => {
    try {
        const { type } = req.body;
        if (!req.file) return res.status(400).json({ error: "No file provided" });
        const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype, false);
        const mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
        const newBanner = new Banner({ imageUrl: result.secure_url, mediaType: mediaType, imagePublicId: result.public_id, type: type || 'top' });
        await newBanner.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/product/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            if (product.imagePublicId) await cloudinary.uploader.destroy(product.imagePublicId, { resource_type: product.mediaType === 'video' ? 'video' : 'image' });
            await Product.findByIdAndDelete(req.params.id);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/banner/:id', async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);
        if (banner) {
            if (banner.imagePublicId) await cloudinary.uploader.destroy(banner.imagePublicId, { resource_type: banner.mediaType === 'video' ? 'video' : 'image' });
            await Banner.findByIdAndDelete(req.params.id);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get(/.*/, (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.status(404).json({ error: "API route not found" });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
