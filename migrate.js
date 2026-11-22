require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    timeout: 120000 // 2 minute timeout
});

mongoose.connect(process.env.MONGO_URI).then(() => console.log("✅ DB Connected for Migration"));

const Product = mongoose.model('Product', new mongoose.Schema({
    name: String, imageUrl: String, imagePublicId: String, additionalImages: [String]
}));
const Banner = mongoose.model('Banner', new mongoose.Schema({
    imageUrl: String, imagePublicId: String
}));

function uploadToCloudinary(base64String) {
    return cloudinary.uploader.upload(base64String, {
        folder: 'indian-celebration', 
        fetch_format: 'auto', 
        quality: 'auto:good', 
        width: 1000, // Banners ke liye thoda bada width
        crop: 'limit'
    });
}

async function migrate() {
    try {
        console.log("⏳ Checking Products... (49 already migrated hain, bache hue check honge)");
        const products = await Product.find({});
        let pCount = 0;

        for (let p of products) {
            let updated = false;
            let updateData = {};

            if (p.imageUrl && p.imageUrl.startsWith('data:image')) {
                try {
                    console.log(`Uploading main image for: ${p.name}...`);
                    const result = await uploadToCloudinary(p.imageUrl);
                    updateData.imageUrl = result.secure_url;
                    updateData.imagePublicId = result.public_id;
                    updated = true;
                } catch (err) {
                    console.error(`❌ Failed main image for ${p.name}:`, err.message);
                }
            }

            if (p.additionalImages && p.additionalImages.length > 0) {
                let newAddImages = [];
                let addUpdated = false;
                for (let img of p.additionalImages) {
                    if (img.startsWith('data:image')) {
                        try {
                            const result = await uploadToCloudinary(img);
                            newAddImages.push(result.secure_url);
                            addUpdated = true;
                        } catch (err) {
                            console.error(`❌ Failed extra image for ${p.name}`);
                            newAddImages.push(img); 
                        }
                    } else { newAddImages.push(img); }
                }
                if (addUpdated) { updateData.additionalImages = newAddImages; updated = true; }
            }

            if (updated) { await Product.findByIdAndUpdate(p._id, updateData); pCount++; }
        }
        console.log(`✅ ${pCount} New Products migrated.`);

        console.log("⏳ Migrating Banners... (Thoda time lagega)");
        const banners = await Banner.find({});
        let bCount = 0;

        for (let b of banners) {
            if (b.imageUrl && b.imageUrl.startsWith('data:image')) {
                try {
                    console.log(`Uploading Banner (ID: ${b._id})...`);
                    const result = await uploadToCloudinary(b.imageUrl);
                    await Banner.findByIdAndUpdate(b._id, {
                        imageUrl: result.secure_url, imagePublicId: result.public_id
                    });
                    bCount++;
                    console.log(`✅ Banner ${b._id} Done.`);
                } catch (err) {
                    console.error(`❌ Failed to upload Banner ${b._id}:`, err.message);
                }
            }
        }
        console.log(`✅ ${bCount} Banners migrated successfully.`);
        
        console.log("🎉 ALL DONE! Script khatam.");
        process.exit();
    } catch (error) {
        console.error("❌ Main Script Error:", error); 
        process.exit(1);
    }
}
migrate();
