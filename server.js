require('dotenv').config();
const crypto = require('crypto'); // ✅ FIX: Crypto module import kiya
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- MONGODB CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully!"))
    .catch(err => console.log("❌ DB Error:", err.message));

// --- MODELS ---
const Product = mongoose.model('Product', new mongoose.Schema({
    name: String, price: Number, oldPrice: Number, category: String, 
    description: String, timerEnd: Number, deliveryDate: String, 
    imageUrl: String, additionalImages: [String]
}));

const Banner = mongoose.model('Banner', new mongoose.Schema({
    imageUrl: String
}));

const Order = mongoose.model('Order', new mongoose.Schema({
    id: String, user: Object, address: String, items: Array, 
    total: Number, utr: String, paymentProof: String, exactTime: String, 
    status: { type: String, default: 'Pending Verification' },
    tracking: { type: Object, default: {} }
}));

// --- APIs ---

// 1. Products & Banners
app.get('/api/products', async (req, res) => {
    try { res.json(await Product.find().sort({ _id: -1 })); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/banners', async (req, res) => {
    try { res.json(await Banner.find()); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/orders', async (req, res) => {
    try { res.json(await Order.find().sort({ _id: -1 })); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. Add Product
app.post('/api/admin/product', async (req, res) => {
    try {
        const { name, price, oldPrice, category, description, timerHours, deliveryDate, images } = req.body;
        
        if (!images || images.length === 0) return res.status(400).json({ error: "Image required" });

        const hours = Number(timerHours) || 0;
        const timerEnd = hours > 0 ? Date.now() + (hours * 60 * 60 * 1000) : null;

        const newProduct = new Product({ 
            name, price: Number(price), oldPrice: Number(oldPrice), 
            category, description, timerEnd, deliveryDate,
            imageUrl: images[0], additionalImages: images.slice(1) 
        });
        
        await newProduct.save();
        res.json({ success: true, message: "Product Saved to DB!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. Edit Product
app.put('/api/admin/product/:id', async (req, res) => {
    try {
        const { name, price, oldPrice, category, description, timerHours, deliveryDate, images } = req.body;
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: "Product not found" });

        let timerEnd = product.timerEnd; 
        if (timerHours !== undefined) {
            const hours = Number(timerHours) || 0;
            timerEnd = hours > 0 ? Date.now() + (hours * 60 * 60 * 1000) : null; 
        }

        product.name = name;
        product.price = Number(price);
        product.oldPrice = Number(oldPrice);
        product.category = category;
        product.description = description;
        product.timerEnd = timerEnd;
        product.deliveryDate = deliveryDate;
        
        if (images && images.length > 0) {
            product.imageUrl = images[0];
            product.additionalImages = images.slice(1);
        }

        await product.save();
        res.json({ success: true, message: "Product Updated!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. Delete Product
app.delete('/api/admin/product/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Product Deleted!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. Add Banner
app.post('/api/admin/banner', async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) return res.status(400).json({ error: "Image required" });
        
        const newBanner = new Banner({ imageUrl: image });
        await newBanner.save();
        res.json({ success: true, message: "Banner Saved to DB!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/banner/:id', async (req, res) => {
    try {
        await Banner.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Banner Deleted!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 6. Place Order
app.post('/api/order', async (req, res) => {
    try {
        const { user, cart, total, address, utr, paymentProof } = req.body;
        if(!paymentProof) return res.status(400).json({ error: "Payment screenshot is required." });
        if(!utr) return res.status(400).json({ error: "UTR is required." });

        const now = new Date();
        const exactTime = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        
        const newOrder = new Order({
            id: 'ORD' + Date.now(),
            user: JSON.parse(user), address: address, items: JSON.parse(cart),
            total: Number(total), utr: utr, paymentProof: paymentProof,
            exactTime: exactTime, 
            tracking: { "Order Placed": exactTime }
        });
        
        await newOrder.save();
        res.json({ success: true, orderId: newOrder.id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 7. Verify Order
app.put('/api/admin/order/:id/verify', async (req, res) => {
    try {
        const order = await Order.findOne({ id: req.params.id });
        if(!order) return res.status(404).json({ error: "Order not found" });

        const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        order.status = 'Paid / Verified';
        
        if(!order.tracking) order.tracking = {};
        order.tracking["Packed"] = now;

        await order.save();
        res.json({ success: true, message: "Order Verified!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 8. Update Tracking
app.put('/api/admin/order/:id/tracking', async (req, res) => {
    try {
        const { trackingStatus } = req.body;
        const order = await Order.findOne({ id: req.params.id });
        if(!order) return res.status(404).json({ error: "Order not found" });

        const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        
        if(!order.tracking) order.tracking = {};
        order.tracking[trackingStatus] = now;
        
        await order.save();
        res.json({ success: true, message: "Tracking Updated!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
