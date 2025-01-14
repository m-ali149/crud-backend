// const dotenv = require("dotenv");
// dotenv.config();
// const express = require("express");
// const app = express();
// const port = process.env.PORT;
// const mongoose = require("mongoose");
// const cors = require("cors");

// mongoose
//   .connect(process.env.MONGO_URI)
//   .then(() => {
//     console.log(
//       `Database connected successfully with ${mongoose.connection.host}`
//     );
//   })
//   .catch((err) => {
//     console.log("DB CONNECTION ERROR", err);
//   });

// const userSchema = new mongoose.Schema({
//   firstName: String,
//   lastName: String,
//   email: String,
//   password: String,
//   avatar: String,
// });

// const userModel = mongoose.model("user", userSchema);

// app.use(express.json());
// app.use(cors());

// app.post("/create", async (req, res) => {
//   const register = new userModel({
//     firstName: req.body.firstName,
//     lastName: req.body.lastName,
//     email: req.body.email,
//     password: req.body.password,
//     avatar: req.body.avatar,
//   });
//   await register.save();
//   res.send(register);
// });
// app.get("/", async (req, res) => {
//   const data = await userModel.find({});
//   console.log("data", data);
//   res.send(data);
// });
// app.delete("/users/:id", async (req, res) => {
//   const { id } = req.params;
//   await userModel.findByIdAndDelete(id);
//   res.send(`User with id ${id} has been deleted successfully`);
// });
// app.patch("/users/:id", async (req, res) => {
//   const { id } = req.params;
//   const body = req.body;
//   const data = await userModel.findByIdAndUpdate(id, body, { new: true });
//   res.send(data);
// });

// app.listen(port, () => {
//   console.log(`Server is up and listening on port ${port}`);
// });



const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const fs = require("fs");
const app = express();
const port = process.env.PORT || 5000;
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const multer = require("multer");

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Save files in the uploads directory
  },
  filename: function (req, file, cb) {
    // Generate a unique filename using the current timestamp and original name
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// Initialize multer with the defined storage and file filter
const upload = multer({ storage: storage, fileFilter: fileFilter });

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
  firstName: String,
  lastName: String,
  email: String,
  password: String,
  avatar: String, // Path or URL to the uploaded image
});

// Create the User model
const userModel = mongoose.model("User", userSchema);

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files from the uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Route to create a new user with image upload
app.post("/create", upload.single("avatar"), async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Construct the avatar URL if a file was uploaded
    let avatarUrl = "";
    if (req.file) {
      avatarUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    }

    // Create a new user instance
    const newUser = new userModel({
      firstName,
      lastName,
      email,
      password,
      avatar: avatarUrl,
    });

    // Save the user to the database
    await newUser.save();

    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: error.message || "Server Error" });
  }
});

// Route to get all users
app.get("/", async (req, res) => {
  try {
    const users = await userModel.find({});
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Route to get a user by ID
app.get("/user/:id", async (req, res) => {
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

// Route to delete a user by ID
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

// Route to update a user by ID
app.patch("/users/:id", upload.single("avatar"), async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, password } = req.body;

    // Initialize update fields
    const updateFields = { firstName, lastName, email, password };

    // If a new avatar is uploaded, include it in the update
    if (req.file) {
      updateFields.avatar = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    }

    // Update the user in the database
    const updatedUser = await userModel.findByIdAndUpdate(id, updateFields, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: error.message || "Server Error" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is up and listening on port ${port}`);
});


/*
Frontend/Testing Notes:
1. To upload an image using Postman:
   - Select POST request to http://localhost:<port>/create
   - In the "Body" tab, choose "form-data"
   - Add the following fields:
     - Key: firstName (Type: Text)
     - Key: lastName (Type: Text)
     - Key: email (Type: Text)
     - Key: password (Type: Text)
     - Key: avatar (Type: File) and upload the image file

2. To implement this in a frontend form:
   - Use a <form> element with enctype="multipart/form-data"
   - Add a file input element for the avatar
   - Submit the form via JavaScript (e.g., Axios, Fetch API)
*/
