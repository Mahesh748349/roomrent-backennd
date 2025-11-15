const express = require("express");
const Property = require("../models/Property");
const auth = require("../middleware/auth");
const router = express.Router();

// Get all properties - PUBLIC ROUTE (no auth required)
router.get("/", async (req, res) => {
  try {
    // Get available properties for public view
    const properties = await Property.find({ isAvailable: true })
      .populate("owner", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      properties,
    });
  } catch (error) {
    console.error("Get properties error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching properties",
    });
  }
});

// Get properties for logged-in users (with auth)
router.get("/my-properties", auth, async (req, res) => {
  try {
    if (req.user.role === "owner") {
      const properties = await Property.find({ owner: req.user.userId })
        .populate("owner", "name email")
        .sort({ createdAt: -1 });
      res.json({
        success: true,
        properties,
      });
    } else {
      // For tenants, show available properties
      const properties = await Property.find({ isAvailable: true })
        .populate("owner", "name email")
        .sort({ createdAt: -1 });
      res.json({
        success: true,
        properties,
      });
    }
  } catch (error) {
    console.error("Get my properties error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching properties",
    });
  }
});

// Add new property (owner only) - PROTECTED
router.post("/", auth, async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only owners can add properties",
      });
    }

    const {
      name,
      address,
      rent,
      bedrooms,
      bathrooms,
      area,
      description,
      features,
    } = req.body;

    // Validation
    if (!name || !address || !rent || !bedrooms || !bathrooms || !area) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled",
      });
    }

    const property = new Property({
      name,
      address: typeof address === "string" ? { street: address } : address,
      rent: Number(rent),
      bedrooms: Number(bedrooms),
      bathrooms: Number(bathrooms),
      area,
      description,
      features: features || [],
      owner: req.user.userId,
      isAvailable: true,
    });

    await property.save();
    await property.populate("owner", "name email");

    res.status(201).json({
      success: true,
      message: "Property added successfully",
      property,
    });
  } catch (error) {
    console.error("Add property error:", error);
    res.status(500).json({
      success: false,
      message: "Error adding property",
    });
  }
});

// Update property (owner only) - PROTECTED
router.put("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only owners can update properties",
      });
    }

    const property = await Property.findOne({
      _id: req.params.id,
      owner: req.user.userId,
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    Object.assign(property, req.body);
    await property.save();
    await property.populate("owner", "name email");

    res.json({
      success: true,
      message: "Property updated successfully",
      property,
    });
  } catch (error) {
    console.error("Update property error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating property",
    });
  }
});

// Delete property (owner only) - PROTECTED
router.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only owners can delete properties",
      });
    }

    const property = await Property.findOne({
      _id: req.params.id,
      owner: req.user.userId,
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    await Property.deleteOne({ _id: req.params.id });

    res.json({
      success: true,
      message: "Property deleted successfully",
    });
  } catch (error) {
    console.error("Delete property error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting property",
    });
  }
});

module.exports = router;
