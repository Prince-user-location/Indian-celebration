require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully!"))
    .catch(err => console.log("❌ DB Error:", err));

// ================= SCHEMAS =================
const Product = mongoose.model('Product', new mongoose.Schema({
    name: String, 
    price: Number, 
    oldPrice: Number, 
    category: String,
    description: String, 
    timerEnd: Number, 
    deliveryDate: String,
    imageUrl: String, 
    additionalImages: [String],
    stock: { type: Number, default: 10 },
    views: { type: Number, default: 0 }
}));

// UPDATED: Added 'type' field for Half Banners
const Banner = mongoose.model('Banner', new mongoose.Schema({
    imageUrl: String,
    type: { type: String, default: 'top' }, // 'top' or 'half'
    startTime: Date,
    endTime: Date
}));

const Order = mongoose.model('Order', new mongoose.Schema({
    id: String,
    user: String,
    cart: String,
    total: Number,
    address: String,
    utr: String,
    paymentProof: String,
    status: { type: String, default: 'Pending Verification' },
    tracking: { type: Object, default: { "Order Placed": new Date().toLocaleString('en-IN') } },
    exactTime: { type: String, default: new Date().toLocaleString('en-IN') }
}));

// ================= FRONTEND API ROUTES =================

// Get All Products
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ _id: -1 });
        res.json(products);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Track Product View
app.post('/api/product/view/:id', async (req, res) => {
    try {
        await Product.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get Active Banners (Top & Half)
app.get('/api/banners', async (req, res) => {
    try {
        const now = new Date();
        // Fetch banners that are either not scheduled or currently active
        const banners = await Banner.find({
            $or: [
                { startTime: null, endTime: null },
                { startTime: { $lte: now }, endTime: { $gte: now } },
                { startTime: { $lte: now }, endTime: null },
                { startTime: null, endTime: { $gte: now } }
            ]
        });
        res.json(banners);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Place Order
app.post('/api/order', async (req, res) => {
    try {
        const { user, cart, total, address, utr, paymentProof } = req.body;
        const orderId = "ORD-" + Math.floor(100000 + Math.random() * 900000);

        const newOrder = new Order({
            id: orderId, user, cart, total, address, utr, paymentProof
        });
        await newOrder.save();

        // Reduce Stock
        const parsedCart = JSON.parse(cart);
        for (let item of parsedCart) {
            await Product.findByIdAndUpdate(item._id, { $inc: { stock: -item.qty } });
        }

        res.json({ success: true, orderId: orderId });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ================= ADMIN API ROUTES =================

// Get All Orders
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ _id: -1 });
        res.json(orders);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Verify Order Payment
app.put('/api/admin/order/:id/verify', async (req, res) => {
    try {
        await Order.findOneAndUpdate({ id: req.params.id }, { status: 'Paid / Verified' });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update Tracking Status
app.put('/api/admin/order/:id/tracking', async (req, res) => {
    try {
        const { trackingStatus } = req.body;
        const order = await Order.findOne({ id: req.params.id });
        
        let tracking = order.tracking || {};
        tracking[trackingStatus] = new Date().toLocaleString('en-IN');
        
        await Order.findOneAndUpdate({ id: req.params.id }, { tracking: tracking });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Add New Product
app.post('/api/admin/product', async (req, res) => {
    try {
        const { name, price, oldPrice, category, description, timerHours, deliveryDate, stock, images } = req.body;
        
        let timerEnd = null;
        if (timerHours && timerHours > 0) {
            timerEnd = Date.now() + (timerHours * 60 * 60 * 1000);
        }

        const newProduct = new Product({
            name, price, oldPrice, category, description, deliveryDate, stock,
            imageUrl: images[0],
            additionalImages: images.slice(1),
            timerEnd: timerEnd
        });

        await newProduct.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Edit Product
app.put('/api/admin/product/:id', async (req, res) => {
    try {
        const { name, price, oldPrice, category, description, timerHours, deliveryDate, stock, images } = req.body;
        
        let updateData = { name, price, oldPrice, category, description, deliveryDate, stock };
        
        if (timerHours && timerHours > 0) {
            updateData.timerEnd = Date.now() + (timerHours * 60 * 60 * 1000);
        } else {
             updateData.timerEnd = null;
        }

        if (images && images.length > 0) {
            updateData.imageUrl = images[0];
            updateData.additionalImages = images.slice(1);
        }

        await Product.findByIdAndUpdate(req.params.id, updateData);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete Product
app.delete('/api/admin/product/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Add New Banner (FIXED: Saving 'type' field)
app.post('/api/admin/banner', async (req, res) => {
    try {
        const { image, type, startTime, endTime } = req.body;
        
        const newBanner = new Banner({
            imageUrl: image,
            type: type || 'top', // 'top' or 'half'
            startTime: startTime ? new Date(startTime) : null,
            endTime: endTime ? new Date(endTime) : null
        });

        await newBanner.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete Banner
app.delete('/api/admin/banner/:id', async (req, res) => {
    try {
        await Banner.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// FIXED: Catch-all route for Express 5+
// ==========================================
app.get(/.*/, (req, res) => {
    // Agar request API ke liye nahi hai, toh index.html bhej do (SPA routing ke liye)
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.status(404).json({ error: "API route not found" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
