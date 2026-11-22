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

// Multer Memory Storage (Images server pe save nahi hongi, direct Cloudinary jayengi)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));

// MongoDB Connection
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

// Baaki schemas (Order etc.) yahan rahenge...

// Helper: Upload to Cloudinary
function uploadToCloudinary(fileBuffer) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: 'indian-celebration', fetch_format: 'auto', quality: 'auto:good', width: 800, crop: 'limit' },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        stream.end(fileBuffer);
    });
}

// ================= ADMIN ROUTES (UPDATED) =================

// Add Product
app.post('/api/admin/product', upload.array('images', 5), async (req, res) => {
    try {
        const { name, price, oldPrice, category, description, timerHours, deliveryDate, stock } = req.body;
        let images = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const result = await uploadToCloudinary(file.buffer);
                images.push({ url: result.secure_url, public_id: result.public_id });
            }
        }
        let timerEnd = timerHours ? Date.now() + (timerHours * 60 * 60 * 1000) : null;
        
        const newProduct = new Product({
            name, price, oldPrice, category, description, deliveryDate, stock,
            imageUrl: images[0] ? images[0].url : '',
            imagePublicId: images[0] ? images[0].public_id : null,
            additionalImages: images.slice(1).map(img => img.url),
            timerEnd: timerEnd
        });
        await newProduct.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Edit Product
app.put('/api/admin/product/:id', upload.array('images', 5), async (req, res) => {
    try {
        const { name, price, oldPrice, category, description, timerHours, deliveryDate, stock } = req.body;
        let updateData = { name, price, oldPrice, category, description, deliveryDate, stock };
        updateData.timerEnd = (timerHours && timerHours > 0) ? Date.now() + (timerHours * 60 * 60 * 1000) : null;

        if (req.files && req.files.length > 0) {
            let images = [];
            for (const file of req.files) {
                const result = await uploadToCloudinary(file.buffer);
                images.push({ url: result.secure_url, public_id: result.public_id });
            }
            updateData.imageUrl = images[0].url;
            updateData.imagePublicId = images[0].public_id;
            updateData.additionalImages = images.slice(1).map(img => img.url);
        }
        await Product.findByIdAndUpdate(req.params.id, updateData);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Add Banner
app.post('/api/admin/banner', upload.single('image'), async (req, res) => {
    try {
        const { type, startTime, endTime } = req.body;
        if (!req.file) return res.status(400).json({ error: "No image provided" });
        
        const result = await uploadToCloudinary(req.file.buffer);
        const newBanner = new Banner({
            imageUrl: result.secure_url, imagePublicId: result.public_id,
            type: type || 'top', startTime: startTime ? new Date(startTime) : null, endTime: endTime ? new Date(endTime) : null
        });
        await newBanner.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete routes, get routes, order routes etc. (Tere purane server.js se copy kar lena yahan)

app.get(/.*/, (req, res) => {
    if (!req.path.startsWith('/api')) res.sendFile(path.join(__dirname, 'public', 'index.html'));
    else res.status(404).json({ error: "API route not found" });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
