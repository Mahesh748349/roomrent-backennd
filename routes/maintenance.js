const express = require("express");
const Maintenance = require("../models/Maintenance");
const Tenant = require("../models/Tenant");
const auth = require("../middleware/auth");
const router = express.Router();

// Get all maintenance requests
router.get("/", auth, async (req, res) => {
  try {
    if (req.user.role === "owner") {
      const maintenance = await Maintenance.find()
        .populate("property", "name address")
        .populate("tenant")
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        maintenance,
      });
    } else {
      const tenant = await Tenant.findOne({ user: req.user.userId });
      if (tenant) {
        const maintenance = await Maintenance.find({ tenant: tenant._id })
          .populate("property", "name")
          .sort({ createdAt: -1 });

        res.json({
          success: true,
          maintenance,
        });
      } else {
        res.json({
          success: true,
          maintenance: [],
        });
      }
    }
  } catch (error) {
    console.error("Get maintenance error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching maintenance requests",
    });
  }
});

// Create maintenance request
router.post("/", auth, async (req, res) => {
  try {
    const { issue, description, priority, propertyId } = req.body;

    let tenant = null;
    let property = null;

    if (req.user.role === "tenant") {
      tenant = await Tenant.findOne({ user: req.user.userId });
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: "Tenant not found",
        });
      }
      property = tenant.property;
    } else {
      property = propertyId;
    }

    const maintenance = new Maintenance({
      property: property,
      tenant: tenant ? tenant._id : null,
      issue,
      description,
      priority: priority || "medium",
      reportedBy: req.user.role,
    });

    await maintenance.save();

    const populatedMaintenance = await Maintenance.findById(maintenance._id)
      .populate("property", "name address")
      .populate("tenant");

    res.status(201).json({
      success: true,
      message: "Maintenance request submitted successfully",
      maintenance: populatedMaintenance,
    });
  } catch (error) {
    console.error("Create maintenance error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating maintenance request",
    });
  }
});

// Update maintenance request
router.put("/:id", auth, async (req, res) => {
  try {
    const maintenance = await Maintenance.findById(req.params.id);

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: "Maintenance request not found",
      });
    }

    // Only owners can update maintenance requests
    if (req.user.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only owners can update maintenance requests",
      });
    }

    Object.assign(maintenance, req.body);

    if (req.body.status === "completed") {
      maintenance.completionDate = new Date();
    }

    await maintenance.save();

    const updatedMaintenance = await Maintenance.findById(maintenance._id)
      .populate("property", "name address")
      .populate("tenant");

    res.json({
      success: true,
      message: "Maintenance request updated successfully",
      maintenance: updatedMaintenance,
    });
  } catch (error) {
    console.error("Update maintenance error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating maintenance request",
    });
  }
});

// Delete maintenance request (owner only)
router.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only owners can delete maintenance requests",
      });
    }

    const maintenance = await Maintenance.findById(req.params.id);

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: "Maintenance request not found",
      });
    }

    await Maintenance.deleteOne({ _id: req.params.id });

    res.json({
      success: true,
      message: "Maintenance request deleted successfully",
    });
  } catch (error) {
    console.error("Delete maintenance error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting maintenance request",
    });
  }
});

module.exports = router;
