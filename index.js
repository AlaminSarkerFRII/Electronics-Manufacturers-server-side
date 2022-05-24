const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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

async function run() {
  try {
    await client.connect();
    // tools create
    const toolCollection = client.db("py_electrics").collection("tools");
    const orderCollection = client.db("py_electrics").collection("orders");
    // create api to load all tools
    app.get("/tool", async (req, res) => {
      const query = req.body;
      const result = await toolCollection.find(query).toArray();
      res.send(result);
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

    // post booking in database

    // app.post("/booking", async (req, res) => {
    //   const booking = req.body;
    //   const query = {
    //     treatment: booking.treatment,
    //     date: booking.date,
    //     patient: booking.patient,
    //   };
    //   const exists = await bookingCollection.findOne(query);
    //   if (exists) {
    //     return res.send({ success: false, booking: exists });
    //   }
    //   const result = await bookingCollection.insertOne(booking);
    //   return res.send({ success: true, result });
    // });

    // find by id
    app.get("/tool/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const tool = await toolCollection.findOne({ _id: ObjectId(id) });
      res.send(tool);
      // console.log(tool);
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
