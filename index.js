const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;




const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log(err));
  

const multerconfig = require("./config/multer");
const Product = require("./models/product");
const User = require("./models/user");





// EJS View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static Files (CSS, JS, Images)
app.use(express.static(path.join(__dirname, 'public')));

// Body Parser (Form data handle করার জন্য)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', async (req, res) => {
   let products = await Product.find();
  
   
    
    res.render('user/index', { products });
});

app.get('/about', (req, res) => {
    // এখানে আপনি টাইটেল বা ডাটা পাঠাতে পারেন
    res.render('user/about');
});




// product

app.get('/admin/products/add', async (req, res) => {
  let products = await Product.find();
  res.render('admin/productadd', { products });
});


// ✅ PRODUCT ADD
app.post(
  "/admin/products/add",
  multerconfig.fields([
    { name: "productsImge", maxCount: 1 }, // main image
    { name: "galleryImages", maxCount: 4 } // extra images
  ]),
  async (req, res) => {

    try {

      // main image
      const mainImage =
        req.files["productsImge"]
          ? `/uploads/products/${req.files["productsImge"][0].filename}`
          : null;

      // gallery images array
      const galleryImages =
        req.files["galleryImages"]
          ? req.files["galleryImages"].map(file =>
              `/uploads/products/${file.filename}`
            )
          : [];

      await Product.create({
        price: req.body.price,
        productname: req.body.productname,
        description: req.body.description,
        productsImge: mainImage,
        galleryImages: galleryImages,
        category: req.body.category || 'Spices' // ক্যাটাগরি সেট করা হলো, ডিফল্ট 'Spices'
      });

      res.redirect("/admin/products/add");

    } catch (error) {
      console.log(error);
      res.send("Upload Error");
    }
});


app.get('/products/details/:id', async (req, res) => {
  try {
    const id = req.params.id;

    // ১. আইডি ভ্যালিড ফরম্যাটে আছে কি না চেক করুন
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).send("Invalid Product ID format");
    }

    // ২. মূল প্রোডাক্ট খুঁজুন
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).send("Product not found");
    }

    // ৩. রিলেটেড প্রোডাক্ট খুঁজুন
    const relatedProducts = await Product.find({
      _id: { $ne: id }
    }).limit(4);

    res.render('user/productdetails', {
      product,
      relatedProducts
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

app.get('/admin/products/delete/:id', async (req, res) => {
 let product = await Product.findByIdAndDelete(req.params.id);
  res.redirect("/admin/products/add");
});



app.get('/products', async (req, res) => {
    try {
        const { search, category, maxPrice, sort } = req.query;
        let query = {};

        // ১. ক্যাটাগরিগুলো ইউনিকভাবে নিয়ে আসা (যাতে লিস্টে ডুপ্লিকেট না হয়)
        const categories = await Product.distinct("category");

        // ২. ফিল্টার লজিক
        if (search) query.productname = { $regex: search, $options: 'i' };
        if (category && category !== 'All') query.category = category;
        if (maxPrice) query.price = { $lte: Number(maxPrice) };

        // ৩. সর্টিং
        let sortOption = {};
        if (sort === 'lowToHigh') sortOption.price = 1;
        if (sort === 'highToLow') sortOption.price = -1;

        const products = await Product.find(query).sort(sortOption);
        
        // categories ভেরিয়েবলটি ইজেএস-এ পাঠিয়ে দিন
        res.render('user/products', { products, categories, query: req.query });
    } catch (err) {
        console.log(err);
        res.status(500).send("Server Error");
    }
});




// Server Listen
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});