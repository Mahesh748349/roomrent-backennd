const express = require("express");
const Tenant = require("../models/Tenant");
const User = require("../models/User");
const Property = require("../models/Property");
const auth = require("../middleware/auth");
const router = express.Router();

// Get all tenants (owner only) or tenant's own info
router.get("/", auth, async (req, res) => {
  try {
    if (req.user.role === "owner") {
      const tenants = await Tenant.find()
        .populate("user", "name email phone")
        .populate("property", "name address")
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        tenants,
      });
    } else {
      // Tenant sees only their own info
      const tenant = await Tenant.findOne({ user: req.user.userId })
        .populate("user", "name email phone")
        .populate("property", "name address rent bedrooms bathrooms area");

      if (!tenant) {
        return res.json({
          success: true,
          tenants: [],
        });
      }

      res.json({
        success: true,
        tenants: [tenant],
      });
    }
  } catch (error) {
    console.error("Get tenants error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching tenants",
    });
  }
});

// Add new tenant (owner only)
router.post("/", auth, async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only owners can add tenants",
      });
    }

    const {
      userId,
      propertyId,
      unit,
      leaseStart,
      leaseEnd,
      rent,
      securityDeposit,
      emergencyContact,
    } = req.body;

    // Validation
    if (!userId || !propertyId || !unit || !leaseStart || !leaseEnd || !rent) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled",
      });
    }

    // Check if user exists and is a tenant
    const user = await User.findOne({ _id: userId, role: "tenant" });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found or is not a tenant",
      });
    }

    // Check if property exists and belongs to owner
    const property = await Property.findOne({
      _id: propertyId,
      owner: req.user.userId,
    });
    if (!property) {
      return res.status(400).json({
        success: false,
        message: "Property not found or access denied",
      });
    }

    // Check if tenant already exists for this property
    const existingTenant = await Tenant.findOne({
      user: userId,
      property: propertyId,
    });
    if (existingTenant) {
      return res.status(400).json({
        success: false,
        message: "Tenant already exists for this property",
      });
    }

    const tenant = new Tenant({
      user: userId,
      property: propertyId,
      unit,
      leaseStart: new Date(leaseStart),
      leaseEnd: new Date(leaseEnd),
      rent: Number(rent),
      securityDeposit: Number(securityDeposit) || 0,
      emergencyContact,
      status: "active",
    });

    await tenant.save();

    // Update property to mark as occupied
    property.isAvailable = false;
    await property.save();

    const populatedTenant = await Tenant.findById(tenant._id)
      .populate("user", "name email phone")
      .populate("property", "name address");

    res.status(201).json({
      success: true,
      message: "Tenant added successfully",
      tenant: populatedTenant,
    });
  } catch (error) {
    console.error("Add tenant error:", error);
    res.status(500).json({
      success: false,
      message: "Error adding tenant",
    });
  }
});

// Update tenant (owner only)
router.put("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only owners can update tenants",
      });
    }

    const tenant = await Tenant.findById(req.params.id).populate("property");

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    // Check if the property belongs to the owner
    if (tenant.property.owner.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    Object.assign(tenant, req.body);

    // Convert dates if provided
    if (req.body.leaseStart) tenant.leaseStart = new Date(req.body.leaseStart);
    if (req.body.leaseEnd) tenant.leaseEnd = new Date(req.body.leaseEnd);

    await tenant.save();

    const updatedTenant = await Tenant.findById(tenant._id)
      .populate("user", "name email phone")
      .populate("property", "name address");

    res.json({
      success: true,
      message: "Tenant updated successfully",
      tenant: updatedTenant,
    });
  } catch (error) {
    console.error("Update tenant error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating tenant",
    });
  }
});

// Remove tenant (owner only)
router.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only owners can remove tenants",
      });
    }

    const tenant = await Tenant.findById(req.params.id).populate("property");

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    // Check if the property belongs to the owner
    if (tenant.property.owner.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    await Tenant.deleteOne({ _id: req.params.id });

    // Mark property as available
    await Property.findByIdAndUpdate(tenant.property._id, {
      isAvailable: true,
    });

    res.json({
      success: true,
      message: "Tenant removed successfully",
    });
  } catch (error) {
    console.error("Remove tenant error:", error);
    res.status(500).json({
      success: false,
      message: "Error removing tenant",
    });
  }
});

module.exports = router;
