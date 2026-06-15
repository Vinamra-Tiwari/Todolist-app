const dotenv = require("dotenv");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const path = require("path");

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Set up mongoose connection local -- uncomment this if you are using it locally
// mongoose.connect("mongodb://127.0.0.1:27017/todolistDB");

// dotenv
dotenv.config({ path: "./config.env" });

// Set up mongoose connection "MongoDB Atlas"

const DB = process.env.DATABASE || "mongodb://mongo:27017/todolistDB";
mongoose.connect(DB, {
  serverSelectionTimeoutMS: 5000
}).catch(err => {
  console.error("MongoDB connection failed:", err.message);
});

// Mongoose Schema for individual to-do list items
const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    default: "Pending" // Pending, In Progress, Completed
  },
  priority: {
    type: String,
    default: "Normal" // Minor, Normal, Critical
  }
});

const Item = new mongoose.model("Item", itemSchema);

const item1 = new Item({
  name: "Evaluate the addition and deletion of user IDs.",
  status: "Pending",
  priority: "Minor"
});

const item2 = new Item({
  name: "Identify the implementation team.",
  status: "In Progress",
  priority: "Normal"
});

const item3 = new Item({
  name: "Install console machines and prerequisite software.",
  status: "Completed",
  priority: "Critical"
});

const defaultItems = [item1, item2, item3];

// Mongoose Schema for custom lists
const listSchema = {
  name: String,
  items: [itemSchema],
};

const List = mongoose.model("List", listSchema);

// Default route for the home page
app.get("/", function (req, res) {
  // Find all items in the collection
  Item.find({})
    .then((foundItems) => {
      if (foundItems.length === 0) {
        // Insert default items if the collection is empty
        Item.insertMany(defaultItems)
          .then(() => {
            console.log("Default items inserted");
            // Redirect to the home page to display the default items
            res.redirect("/");
          })
          .catch((error) => {
            console.log(error);
          });
      } else {
        // Render the home page and pass the found items
        res.render("list", { listTitle: "Today", newListItems: foundItems });
      }
    })
    .catch((error) => {
      console.log(error);
    });
});

// Route for adding new items
app.post("/", function (req, res) {
  const itemName = req.body.newItem;
  const listName = req.body.list;

  // Check if itemName is not an empty string
  if (itemName.trim() !== "") {
    // Create a new item based on the input
    const item = new Item({
      name: itemName,
    });

    if (listName === "Today") {
      // Save the item to the default collection
      item.save();
      res.redirect("/");
    } else {
      // Find the custom list and push the new item
      List.findOne({ name: listName })
        .then((foundItems) => {
          foundItems.items.push(item);
          foundItems.save();
          res.redirect("/" + listName);
        })
        .catch((err) => {
          console.log(err);
        });
    }
  } else {
    if (listName === "Today") {
      res.redirect("/");
    } else {
      List.findOne({ name: listName })
        .then((foundItems) => {
          res.redirect("/" + listName);
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }
});

// Route for deleting items
app.post("/delete", function (req, res) {
  const listName = req.body.listName;
  const checkItemId = req.body.checkbox;

  // Delete the item from the default collection
  if (listName == "Today") {
    deleteCheckedItem();
  } else {
    // Find the custom list and pull the item from the array
    deleteCustomItem();
  }

  async function deleteCheckedItem() {
    await Item.deleteOne({ _id: checkItemId });
    res.redirect("/");
  }

  async function deleteCustomItem() {
    await List.findOneAndUpdate(
      { name: listName },
      { $pull: { items: { _id: checkItemId } } }
    );
    res.redirect("/" + listName);
  }
});

// Route for completing/toggling items
app.post("/complete", async function (req, res) {
  const listName = req.body.listName;
  const itemId = req.body.itemId;

  try {
    if (listName === "Today") {
      const item = await Item.findById(itemId);
      if (item) {
        item.status = item.status === "Completed" ? "Pending" : "Completed";
        await item.save();
      }
      res.redirect("/");
    } else {
      const foundList = await List.findOne({ name: listName });
      if (foundList) {
        const item = foundList.items.id(itemId);
        if (item) {
          item.status = item.status === "Completed" ? "Pending" : "Completed";
          await foundList.save();
        }
      }
      res.redirect("/" + listName);
    }
  } catch (err) {
    console.log(err);
    res.redirect(listName === "Today" ? "/" : "/" + listName);
  }
});

// Custom route for dynamic lists
app.get("/:customListName", function (req, res) {
  const customListName = _.capitalize(req.params.customListName);

  // Find a list with the custom list name
  List.findOne({ name: customListName })
    .then((foundList) => {
      if (!foundList) {
        // Create a new list if it doesn't exist
        const list = new List({
          name: customListName,
          items: defaultItems,
        });

        list.save();
        console.log("saved");
        res.redirect("/" + customListName);
      } else {
        // Render the existing custom list
        res.render("list", {
          listTitle: foundList.name,
          newListItems: foundList.items,
        });
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

// About Page
app.get("/about", function (req, res) {
  res.render("about");
});

// Start the server
if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, function () {
    console.log("Server started on port 3000.");
  });
}

// Export the app for Vercel
module.exports = app;
