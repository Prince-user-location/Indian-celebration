require('dotenv').config();
const mongoose = require('mongoose');

const Product = mongoose.model('Product', new mongoose.Schema({
    name: String, price: Number, oldPrice: Number, category: String, imageUrl: String
}));

const patakeImages = ["https://images.unsplash.com/photo-1605810230434-7631ac76ec81", "https://images.unsplash.com/photo-1543002617-4d2a9a2663c3"];
const clothesImages = ["https://images.unsplash.com/photo-1594938298603-c8148c4dae35", "https://images.unsplash.com/photo-1610030469983-98e550d615ef"];

const generateProducts = () => {
    let products = [];
    // 250 Patake
    for (let i = 1; i <= 250; i++) {
        products.push({
            name: `Premium Pataka Combo ${i}`, price: Math.floor(Math.random() * 500) + 100,
            oldPrice: Math.floor(Math.random() * 1000) + 600, category: "patake", imageUrl: patakeImages[i % 2]
        });
    }
    // 250 Clothes
    for (let i = 1; i <= 250; i++) {
        products.push({
            name: `Diwali Ethnic Wear ${i}`, price: Math.floor(Math.random() * 1500) + 500,
            oldPrice: Math.floor(Math.random() * 3000) + 2000, category: "clothes", imageUrl: clothesImages[i % 2]
        });
    }
    return products;
};

mongoose.connect(process.env.MONGO_URI).then(async () => {
    await Product.deleteMany({}); // Purana data clear karega
    await Product.insertMany(generateProducts());
    console.log("500+ Products Added Successfully!");
    process.exit();
});
