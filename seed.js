require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Connected for Seeding..."))
    .catch(err => console.log(err));

const Product = mongoose.model('Product', new mongoose.Schema({
    name: String, price: Number, oldPrice: Number, category: String,
    description: String, timerEnd: Number, deliveryDate: String,
    imageUrl: String, additionalImages: [String],
    stock: { type: Number, default: 10 },
    views: { type: Number, default: 0 }
}));

const seedData = async () => {
    try {
        // SIRF minutes aur value365 ko delete karega, taaki duplicate na ho. 
        // Tere home page wale products (patake, clothes) SAFE rahenge!
        await Product.deleteMany({ category: { $in: ['minutes', 'value365'] } });

        let products = [];

        // ==========================================
        // MINUTES (Grocery) Products
        // ==========================================
        const groceryItems = [
            { name: "Fresh Onion 1kg", img: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400" },
            { name: "Tata Salt 1kg", img: "https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=400" },
            { name: "Aashirvaad Atta 5kg", img: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400" },
            { name: "Fortune Sunflower Oil 1L", img: "https://images.unsplash.com/photo-1620706208034-e08d50c7f8d4?w=400" },
            { name: "Amul Taaza Milk 500ml", img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400" },
            { name: "Lays Classic Chips", img: "https://images.unsplash.com/photo-1566478989037-e924e9773b8a?w=400" },
            { name: "Maggi 2-Min Noodles", img: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400" },
            { name: "Dettol Soap Pack", img: "https://images.unsplash.com/photo-1600857062241-98e5dba7f214?w=400" },
            { name: "Colgate MaxFresh", img: "https://images.unsplash.com/photo-1559598467-f8b76c8155d0?w=400" },
            { name: "Surf Excel 1kg", img: "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=400" }
        ];

        for(let i=0; i<20; i++) { // 20 products for minutes
            let item = groceryItems[i % groceryItems.length];
            products.push({
                name: item.name, price: Math.floor(Math.random() * 200) + 20, oldPrice: 300,
                category: "minutes", description: "Fresh grocery item.",
                imageUrl: item.img, stock: 50, views: Math.floor(Math.random()*100)
            });
        }

        // ==========================================
        // VALUE 365 Products
        // ==========================================
        const valueItems = [
            { name: "Ubon Smartwatch", img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400" },
            { name: "1000W Dry Iron", img: "https://images.unsplash.com/photo-1585156700989-6c9b0f0b0f0f?w=400" },
            { name: "SmartBuy Mixer Grinder", img: "https://images.unsplash.com/photo-1584269600519-1c5c9c1f8a8a?w=400" },
            { name: "Boat Bassheads Earbuds", img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400" },
            { name: "Samsung 32 inch TV", img: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400" },
            { name: "Prestige Pressure Cooker", img: "https://images.unsplash.com/photo-1585839216619-14d8732c2f4e?w=400" },
            { name: "Philips LED Bulb", img: "https://images.unsplash.com/photo-1550985618-56a2662b4779?w=400" },
            { name: "Havells Ceiling Fan", img: "https://images.unsplash.com/photo-1592170403323-2632e0e6e3c1?w=400" },
            { name: "Nike Running Shoes", img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400" },
            { name: "Wildcraft Backpack", img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400" }
        ];

        for(let i=0; i<20; i++) { // 20 products for value365
            let item = valueItems[i % valueItems.length];
            products.push({
                name: item.name, price: Math.floor(Math.random() * 3000) + 499, oldPrice: 5000,
                category: "value365", description: "Best deal product.",
                imageUrl: item.img, stock: 20, views: Math.floor(Math.random()*100)
            });
        }

        await Product.insertMany(products);
        console.log("✅ Safe Seeding Done! Sirf Minutes aur Value365 add hue hain.");
        process.exit();
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

seedData();
