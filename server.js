const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const mongoose = require("mongoose");
const cors = require("cors");

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log(`Database connected successfully`);
  })
  .catch((err) => {
    console.error("DB CONNECTION ERROR:", err.message);
  });

// Define the User schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: true },
});

// Create the User model
const userModel = mongoose.model("User", userSchema);

// Middleware
app.use(express.json());
app.use(cors());

// CRUD Routes for Users

// Create a new user
app.post("/users", async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;

    // Check if the email is already registered
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Create a new user
    const newUser = new userModel({
      name,
      email,
      password,
      phoneNumber,
    });

    // Save to database
    await newUser.save();

    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: error.message || "Server Error" });
  }
});

// Read all users
app.get("/users", async (req, res) => {
  try {
    const users = await userModel.find({});
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Read a single user by ID
app.get("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userModel.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Update a user by ID
app.patch("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, phoneNumber } = req.body;

    // Update user in the database
    const updatedUser = await userModel.findByIdAndUpdate(
      id,
      { name, email, password, phoneNumber },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: error.message || "Server Error" });
  }
});

// Delete a user by ID
app.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await userModel.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: `User with id ${id} has been deleted successfully` });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is up and listening on port ${port}`);
});
