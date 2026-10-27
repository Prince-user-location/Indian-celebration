require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- FOLDERS SETUP ---
const uploadDir = path.join(__dirname, 'public', 'uploads');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const productsFile = path.join(dataDir, 'products.json');
const bannersFile = path.join(dataDir, 'banners.json');
const ordersFile = path.join(dataDir, 'orders.json');

if (!fs.existsSync(productsFile)) fs.writeFileSync(productsFile, '[]');
if (!fs.existsSync(bannersFile)) fs.writeFileSync(bannersFile, '[]');
if (!fs.existsSync(ordersFile)) fs.writeFileSync(ordersFile, '[]');

// --- MULTER CONFIG ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, uploadDir) },
    filename: function (req, file, cb) { cb(null, 'img_' + Date.now() + path.extname(file.originalname)) }
});
const upload = multer({ storage: storage });

const readData = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// --- APIs ---
app.get('/api/products', (req, res) => res.json(readData(productsFile)));
app.get('/api/banners', (req, res) => res.json(readData(bannersFile)));
app.get('/api/orders', (req, res) => res.json(readData(ordersFile)));

// Order Submit Route
app.post('/api/order', upload.single('paymentProof'), (req, res) => {
    try {
        const { user, cart, total, address, utr } = req.body;
        if(!req.file) return res.status(400).json({ error: "Payment screenshot is required." });
        if(!utr) return res.status(400).json({ error: "UTR is required." });

        const orders = readData(ordersFile);
        const now = new Date();
        const exactTime = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + `.${now.getMilliseconds()} ms`;

        const newOrder = {
            id: 'ORD' + Date.now(),
            user: JSON.parse(user),
            address: address,
            items: JSON.parse(cart),
            total: Number(total),
            utr: utr,
            paymentProof: `/uploads/${req.file.filename}`,
            exactTime: exactTime,
            status: 'Pending Verification' 
        };
        orders.unshift(newOrder);
        writeData(ordersFile, orders);
        res.json({ success: true, orderId: newOrder.id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// NEW: Verify Order API (Admin Panel ke liye)
app.put('/api/admin/order/:id/verify', (req, res) => {
    try {
        let orders = readData(ordersFile);
        const index = orders.findIndex(o => o.id === req.params.id);
        if(index === -1) return res.status(404).json({ error: "Order not found" });

        orders[index].status = 'Paid / Verified';
        writeData(ordersFile, orders);
        res.json({ success: true, message: "Order Verified!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin Routes (Products & Banners)
app.post('/api/admin/product', upload.array('imageFiles', 5), (req, res) => {
    try {
        const { name, price, oldPrice, category, description } = req.body;
        let images = [];
        if (req.files && req.files.length > 0) images = req.files.map(f => `/uploads/${f.filename}`);
        else if (req.body.imageUrl) images.push(req.body.imageUrl);
        if (images.length === 0) return res.status(400).json({ error: "Image required" });

        const products = readData(productsFile);
        const newProduct = { _id: 'prod_' + Date.now(), name, price: Number(price), oldPrice: Number(oldPrice), category, description, imageUrl: images[0], additionalImages: images.slice(1) };
        products.unshift(newProduct);
        writeData(productsFile, products);
        res.json({ success: true, message: "Product Saved!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/product/:id', (req, res) => {
    try {
        let products = readData(productsFile);
        products = products.filter(p => p._id !== req.params.id);
        writeData(productsFile, products);
        res.json({ success: true, message: "Product Deleted!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/banner', upload.single('imageFile'), (req, res) => {
    try {
        let finalImage = req.file ? `/uploads/${req.file.filename}` : req.body.imageUrl;
        if (!finalImage) return res.status(400).json({ error: "Image required" });
        const banners = readData(bannersFile);
        banners.push({ _id: 'ban_' + Date.now(), imageUrl: finalImage });
        writeData(bannersFile, banners);
        res.json({ success: true, message: "Banner Saved!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/banner/:id', (req, res) => {
    try {
        let banners = readData(bannersFile);
        banners = banners.filter(b => b._id !== req.params.id);
        writeData(bannersFile, banners);
        res.json({ success: true, message: "Banner Deleted!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
