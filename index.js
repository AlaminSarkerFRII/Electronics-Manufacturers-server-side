const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

//middle ware
app.use(cors());
app.use(express.json());

// connect with mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.er99c.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// verify JWT token start

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorization Access" });
  }
  const token = authHeader.split(" ")[1]; // token er second elements
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      res.status(403).send({ message: "Forbidden Access" });
      return;
    }
    req.decoded = decoded;
    next(); // forwarding
  });
}

// verify JWT token end

async function run() {
  try {
    await client.connect();
    // tools create
    const toolCollection = client.db("py_electrics").collection("tools");
    const orderCollection = client.db("py_electrics").collection("orders");
    const userCollection = client.db("py_electrics").collection("users");
    // create api to load all tools
    app.get("/tool", async (req, res) => {
      const query = req.body;
      const result = await toolCollection.find(query).toArray();
      res.send(result);
    });

    // get all orders in my orders page

    app.get("/order", async (req, res) => {
      const query = {};
      const orders = await orderCollection.find(query).toArray();
      res.send(orders);
      // console.log(orders);
    });

    //post user orders in database...

    app.post("/order", async (req, res) => {
      const order = req.body;
      const query = {
        name: order.name,
        price: order.price,
        email: order.email,
        address: order.address,
      };
      const exists = await orderCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, order: exists });
      }
      const result = await orderCollection.insertOne(order);
      res.send(result);
      // console.log(result);
    });

    // get user order by id
    app.get("/tool/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const tool = await toolCollection.findOne({ _id: ObjectId(id) });
      res.send(tool);
      // console.log(tool);
    });

    // delete

    app.delete("/order/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const order = await orderCollection.deleteOne({ _id: ObjectId(id) });
      res.send(order);
      // console.log(tool);
    });

    // get All from database

    app.get("/user", verifyJWT, async (req, res) => {
      const query = {};
      const users = await userCollection.find(query).toArray();
      res.send(users);
    });

    // insert update user in db akhane jwt asign kora jabe cause sign hocche

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      console.log("HI", token);
      res.send({ result, token });
    });

    // make user admin by admin ....
    app.put("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      //if user !==admin than he cant make admin
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      } else {
        res.status(403).send({ message: "Forbidden" });
      }

      // check user is admin or not

      app.get("/admin/:email", async (req, res) => {
        const email = req.params.email;
        const user = await userCollection.findOne({ email: email });
        const isAdmin = user.role === "admin";
        res.send({ admin: isAdmin });
      });
    });
  } finally {
  }
}
run().catch(console.dir);

// basic api create
app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(port, () => {
  console.log(`Server is Running port of ${port}`);
});
