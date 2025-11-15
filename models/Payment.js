const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "overdue", "partial"],
      default: "pending",
    },
    method: {
      type: String,
      enum: ["cash", "check", "bank transfer", "credit card", "online"],
      default: "online",
    },
    month: {
      type: String,
      required: true,
    },
    reference: String,
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
paymentSchema.index({ tenant: 1, paymentDate: -1 });
paymentSchema.index({ status: 1, dueDate: 1 });

module.exports = mongoose.model("Payment", paymentSchema);
