const express = require("express");
const Payment = require("../models/Payment");
const Tenant = require("../models/Tenant");
const auth = require("../middleware/auth");
const router = express.Router();

// Get all payments
router.get("/", auth, async (req, res) => {
  try {
    if (req.user.role === "owner") {
      // Owner sees all payments for their properties
      const payments = await Payment.find()
        .populate("tenant")
        .populate("property", "name address")
        .sort({ paymentDate: -1 });

      res.json({
        success: true,
        payments,
      });
    } else {
      // Tenant sees only their payments
      const tenant = await Tenant.findOne({ user: req.user.userId });
      if (tenant) {
        const payments = await Payment.find({ tenant: tenant._id })
          .populate("property", "name")
          .sort({ paymentDate: -1 });

        res.json({
          success: true,
          payments,
        });
      } else {
        res.json({
          success: true,
          payments: [],
        });
      }
    }
  } catch (error) {
    console.error("Get payments error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching payments",
    });
  }
});

// Record payment (tenant or owner)
router.post("/", auth, async (req, res) => {
  try {
    const { amount, method, month, propertyId, reference, notes } = req.body;

    let tenant;
    let property;

    if (req.user.role === "tenant") {
      // Tenant making payment
      tenant = await Tenant.findOne({ user: req.user.userId });
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: "Tenant not found",
        });
      }
      property = tenant.property;
    } else {
      // Owner recording payment for tenant
      if (!req.body.tenantId) {
        return res.status(400).json({
          success: false,
          message: "Tenant ID is required for owner payments",
        });
      }
      tenant = await Tenant.findById(req.body.tenantId);
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: "Tenant not found",
        });
      }
      property = propertyId || tenant.property;
    }

    const payment = new Payment({
      tenant: tenant._id,
      property: property,
      amount: Number(amount),
      method,
      month,
      dueDate: new Date(),
      paymentDate: new Date(),
      reference,
      notes,
      status: "paid",
    });

    await payment.save();

    const populatedPayment = await Payment.findById(payment._id)
      .populate("property", "name")
      .populate("tenant");

    res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      payment: populatedPayment,
    });
  } catch (error) {
    console.error("Record payment error:", error);
    res.status(500).json({
      success: false,
      message: "Error recording payment",
    });
  }
});

// Get payment statistics (owner only)
router.get("/stats", auth, async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only owners can view payment statistics",
      });
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Monthly revenue
    const monthlyRevenue = await Payment.aggregate([
      {
        $match: {
          status: "paid",
          paymentDate: {
            $gte: new Date(currentYear, currentMonth - 1, 1),
            $lt: new Date(currentYear, currentMonth, 1),
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    // Yearly revenue
    const yearlyRevenue = await Payment.aggregate([
      {
        $match: {
          status: "paid",
          paymentDate: {
            $gte: new Date(currentYear, 0, 1),
            $lt: new Date(currentYear + 1, 0, 1),
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    // Payment methods distribution
    const paymentMethods = await Payment.aggregate([
      {
        $match: { status: "paid" },
      },
      {
        $group: {
          _id: "$method",
          count: { $sum: 1 },
          total: { $sum: "$amount" },
        },
      },
    ]);

    res.json({
      success: true,
      stats: {
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        yearlyRevenue: yearlyRevenue[0]?.total || 0,
        paymentMethods,
      },
    });
  } catch (error) {
    console.error("Payment stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching payment statistics",
    });
  }
});

module.exports = router;
