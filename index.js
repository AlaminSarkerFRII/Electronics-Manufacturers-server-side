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
    // create api to load all tools
    app.get("/tool", async (req, res) => {
      const query = req.body;
      const result = await toolCollection.find(query).toArray();
      res.send(result);
    });
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
