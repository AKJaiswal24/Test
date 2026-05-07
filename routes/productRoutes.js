const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

// GET ALL (optional)
router.get("/", async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

// GET BY ID
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Error fetching product" });
  }
});

// category 
router.get("/category/:name", async (req, res) => {
  const products = await Product.find({
    category: req.params.name
  });

  res.json(products);
});

router.get("/", async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

module.exports = router;