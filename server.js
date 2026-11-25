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

// Cloudinary Config
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

// FIX 1: maxAge hata diya gaya hai taaki browser purana code cache na kare
app.use(express.static(path.join(__dirname, 'public')));

// FIX 2: Terminal mein requests dekhne ke liye Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] Request: ${req.method} ${req.url}`);
    next();
});

// MongoDB Connection
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

const AppSettings = mongoose.model('AppSettings', new mongoose.Schema({
    offlineImg: String, profileBanner: String, supermoneyImg: String,
    tabWeekly: String, tabTravel: String, tabValue365: String, tabGifts: String,
    iconAccount: String, iconHelp: String, iconCart: String,
    catGrocery: String, catBoy: String, catChildren: String, catMan: String, catElectronics: String, catFestival: String, catDailyUses: String
}));

// Helper: Upload to Cloudinary
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

// Get Products
app.get('/api/products', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 30;
        const products = await Product.find().sort({ _id: -1 }).limit(limit);
        res.json(products);
    } catch (err) { 
        console.error("Products API Error:", err);
        res.status(500).json({ error: err.message }); 
    }
});

// Get Banners
app.get('/api/banners', async (req, res) => {
    try { 
        const banners = await Banner.find().sort({ _id: -1 });
        res.json(banners); 
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get Settings
app.get('/api/settings', async (req, res) => {
    try {
        let settings = await AppSettings.findOne();
        if (!settings) settings = await AppSettings.create({});
        res.json(settings);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ... (Aapke baaki API routes: order, settings update, product add, banner add, delete waghera yahan rahenge, unhe mat chedna)

// ================= CATCH-ALL ROUTE =================
app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: "API route not found" });
    }
    if (path.extname(req.path).length > 0) {
        return res.status(404).send(`<h1>404 - File Not Found</h1><p>File public folder mein nahi mili: ${req.path}</p>`);
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
