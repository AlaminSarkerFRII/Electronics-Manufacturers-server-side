const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const token = authHeader.split(" ")[1];
  // verify a token symmetric
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    // call to next for forward
    next();
  });
}

async function run() {
  try {
    await client.connect();
    // tools create
    const toolCollection = client.db("py_electrics").collection("tools");
    const orderCollection = client.db("py_electrics").collection("orders");
    const userCollection = client.db("py_electrics").collection("users");
    const reviewCollection = client.db("py_electrics").collection("reviews");
    const paymentCollection = client.db("py_electrics").collection("payments");
    

    // verify Admin 
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({ email: requester });
      if (requesterAccount.role === 'admin') {
        next();
      }
      else {
        res.status(403).send({ message: 'forbidden' });
      }
    }

    // ==============create api to load all tools===================>
    app.get("/tool",verifyJWT, async (req, res) => {
      const result = await toolCollection.find().toArray();
      res.send(result);
    });


    // ===DELETE=== manage tool / products====>

    app.delete("tool/:id",async(req,res)=>{
      const id = req.params.id
      const query = { _id: ObjectId(id)}
      const tool = await toolCollection.deleteOne(query).toArray()
      res.send(tool);

    })
  //======= post new tools==========POST======>
  app.post("/tool", verifyJWT, async (req, res) => {
    const newTool = req.body;
    const tools = await toolCollection.insertOne(newTool);
    res.send(tools);
  });

  // get user order by tool id
  app.get("/tool/:id", async (req, res) => {
    const id = req.params.id;
    const tool = await toolCollection.findOne({ _id: ObjectId(id) });
    res.send(tool);
  });
    

    // get all reviews
    app.get("/review", async (req, res) => {
      // const query = {}; // not need in get api
      const reviews = await reviewCollection.find().toArray();
      res.send(reviews);
      // console.log(orders);
    });
    // post reviews 
    app.post("/review", verifyJWT, async (req, res) => {
      const newTool = req.body;
      const reviews = await reviewCollection.insertOne(newTool);
      res.send(reviews);
    });

    //=============get all orders for admin page ==============//

      // get all reviews
      app.get("/orders", verifyJWT, async (req, res) => {
        // const query = {};
        const orders = await orderCollection.find().toArray();
        res.send(orders);
        // console.log(orders);
      });


    // get orders by every one user in my orders page
    app.get("/order",verifyJWT, async (req, res) => {
      const email = req.query.email
      const decodedEmail = req.decoded.email
      if(email===decodedEmail){
        const query = {email:email}
        const orders = await orderCollection.find(query).toArray();
      return res.send(orders);

      }
      else {
        return res.status(403).send({ message: "forbidden access" });
      }
    });


    //post user orders in database...
    app.post("/order",verifyJWT, async (req, res) => {
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

  

    // payment for specific order
    app.get("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const order = await orderCollection.findOne({ _id: ObjectId(id) });
      res.send(order);
    });

    // payment system
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const order = req.body;
      const price = order.price;
      const amount = price * 100;
      console.log(amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    // payment update
    app.patch("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const result = await paymentCollection.insertOne(payment);
      const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
      res.send(updatedOrder);
    });

    // user order DELETE from Database with ui
    app.delete("/order/:id", async (req, res) => {
      const id = req.params.id;
      const order = await orderCollection.deleteOne({ _id: ObjectId(id) });
      res.send(order);
    });

    // get All users from database
    app.get("/user",  async (req, res) => {
      // const query = {};// not need in get api
      const users = await userCollection.find().toArray();
      // console.log(users)
      res.send(users);
    });


    /// ===========new api  =============
    app.post("/user",  async (req, res) => {
      const email = req.body
      console.log(email)
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
      );
      // console.log(users)
      res.send(token);
    });
    

    // ===========insert update user in db ===========//
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          name:user.name,
          phone:user.phone,
          about:user.about,
          education:user.education,
          profession:user.profession,
          address:user.address,
          linkedin:user.linkedin,
          img:user.img,
        }
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });


    // ==========insert update user in db akhane jwt asign kora jabena cause sign hocche===============//
    app.put("/users/:email", async (req, res) => {
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
        { expiresIn: "1d" }
      );
      // console.log("HI", token);
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
    });

      // check user is admin or not
      app.get("/admin/:email",verifyJWT, async (req, res) => {
        const email = req.params.email;
        const user = await userCollection.findOne({ email: email });
        const isAdmin = user.role === "admin";
        res.send({ admin: isAdmin });
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
