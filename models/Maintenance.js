const mongoose = require("mongoose");

const maintenanceSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
    },
    issue: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "emergency"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["pending", "assigned", "in-progress", "completed", "cancelled"],
      default: "pending",
    },
    reportedBy: {
      type: String,
      enum: ["tenant", "owner"],
      required: true,
    },
    assignedTo: {
      name: String,
      phone: String,
      company: String,
    },
    estimatedCost: Number,
    actualCost: Number,
    completionDate: Date,
    images: [String],
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
maintenanceSchema.index({ property: 1, status: 1 });
maintenanceSchema.index({ priority: 1, createdAt: -1 });

module.exports = mongoose.model("Maintenance", maintenanceSchema);
