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
if (!fs.existsSync(productsFile)) fs.writeFileSync(productsFile, '[]');
if (!fs.existsSync(bannersFile)) fs.writeFileSync(bannersFile, '[]');

// --- MULTER CONFIG ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, uploadDir) },
    filename: function (req, file, cb) { cb(null, 'img_' + Date.now() + path.extname(file.originalname)) }
});
const upload = multer({ storage: storage });

// --- HELPERS ---
const readData = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// --- ROUTES ---

// Get Data
app.get('/api/products', (req, res) => res.json(readData(productsFile)));
app.get('/api/banners', (req, res) => res.json(readData(bannersFile)));

// 1. ADD PRODUCT (Multiple Images)
app.post('/api/admin/product', upload.array('imageFiles', 5), (req, res) => {
    try {
        const { name, price, oldPrice, category, description } = req.body;
        let images = [];
        
        if (req.files && req.files.length > 0) {
            images = req.files.map(f => `/uploads/${f.filename}`);
        } else if (req.body.imageUrl) {
            images.push(req.body.imageUrl);
        }

        if (images.length === 0) return res.status(400).json({ error: "Image required" });

        const products = readData(productsFile);
        const newProduct = {
            _id: 'prod_' + Date.now(),
            name, price: Number(price), oldPrice: Number(oldPrice), category, description,
            imageUrl: images[0], // Main image
            additionalImages: images.slice(1) // Other images
        };

        products.unshift(newProduct);
        writeData(productsFile, products);
        res.json({ success: true, message: "Product Saved Successfully!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. EDIT PRODUCT
app.put('/api/admin/product/:id', upload.array('imageFiles', 5), (req, res) => {
    try {
        const { name, price, oldPrice, category, description, existingImages } = req.body;
        let products = readData(productsFile);
        const index = products.findIndex(p => p._id === req.params.id);
        
        if (index === -1) return res.status(404).json({ error: "Product not found" });

        // Existing images sent from frontend as JSON string
        let images = existingImages ? JSON.parse(existingImages) : [];
        
        // If new files uploaded, add them
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(f => `/uploads/${f.filename}`);
            images = [...newImages, ...images]; // New images first
        }

        products[index] = {
            ...products[index],
            name, price: Number(price), oldPrice: Number(oldPrice), category, description,
            imageUrl: images[0] || products[index].imageUrl,
            additionalImages: images.slice(1)
        };

        writeData(productsFile, products);
        res.json({ success: true, message: "Product Updated!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. DELETE PRODUCT
app.delete('/api/admin/product/:id', (req, res) => {
    try {
        let products = readData(productsFile);
        products = products.filter(p => p._id !== req.params.id);
        writeData(productsFile, products);
        res.json({ success: true, message: "Product Deleted!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. ADD BANNER
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

// 5. EDIT BANNER
app.put('/api/admin/banner/:id', upload.single('imageFile'), (req, res) => {
    try {
        let banners = readData(bannersFile);
        const index = banners.findIndex(b => b._id === req.params.id);
        if (index === -1) return res.status(404).json({ error: "Banner not found" });

        let finalImage = req.file ? `/uploads/${req.file.filename}` : req.body.imageUrl;
        
        if(finalImage) banners[index].imageUrl = finalImage;
        
        writeData(bannersFile, banners);
        res.json({ success: true, message: "Banner Updated!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 6. DELETE BANNER
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
