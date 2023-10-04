const express = require("express");
const cors = require("cors");
const { PassThrough } = require("stream");
const multipass = require(`./modules/multipass/index.js`);

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("openv0.sqlite", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to the database");
  }
});
const { Sequelize, DataTypes } = require("sequelize");
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "openv0.sqlite",
  logging: false, // quiet mode
});

const Component = sequelize.define(
  "Component",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    version: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    framework: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    components: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    icons: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    query: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    logs: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  { timestamps: false },
);

app.get("/components/list", async (req, res) => {
  const { framework, components, icons } = req.query;
  const db_response = await Component.findAll({
    where: {
      framework,
      components,
      icons,
    },
  });
  let retrieved_components = {};
  db_response
    .map((c) => c.toJSON())
    .map((c) => {
      let description = ``;
      try {
        description = JSON.parse(c.logs).stages[`component-design-task`].data
          .description.user;
      } catch (e) {
        false;
      }
      const component = {
        version: c.version,
        //code: c.code,
        description,
      };
      if (Object.keys(retrieved_components).includes(c.name))
        retrieved_components[c.name].push(component);
      else retrieved_components[c.name] = [component];
    });
  // console.dir({retrieved_components})
  res.json({
    items: Object.keys(retrieved_components).map((k) => {
      return {
        name: k,
        versions: retrieved_components[k].length,
        latest: retrieved_components[k].map((e) => e.version).slice(-1)[0],
        components: retrieved_components[k],
      };
    }),
  });
});

app.get("/components/get", async (req, res) => {
  const { framework, components, icons, name } = req.query;
  const db_response = await Component.findAll({
    where: {
      framework,
      components,
      icons,
      name,
    },
  });
  const retrieved_components = db_response
    .map((c) => c.toJSON())
    .map((c) => {
      let description = ``;
      try {
        description = JSON.parse(c.logs).stages[`component-design-task`].data
          .description.user;
      } catch (e) {
        false;
      }
      return {
        name: c.name,
        version: c.version,
        code: c.code,
        description,
      };
    })
    .sort((a, b) => {
      return b.version - a.version;
    });
  // console.dir({retrieved_components})
  res.json({
    items: retrieved_components,
  });
});

app.post("/components/new/description", async (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  const duplexStream = new PassThrough();
  duplexStream.pipe(res);
  const generated = await multipass.preset({
    stream: duplexStream,
    preset: `componentNew_description`,
    query: {
      description: req.body.description,
      framework: req.body.framework,
      components: req.body.components,
      icons: req.body.icons,
    },
  });
  duplexStream.end();
});

app.post("/components/new/json", async (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  const duplexStream = new PassThrough();
  duplexStream.pipe(res);
  const generated = await multipass.preset({
    stream: duplexStream,
    preset: `componentNew_json`,
    query: {
      json: req.body.json,
      framework: req.body.framework,
      components: req.body.components,
      icons: req.body.icons,
    },
  });
  duplexStream.end();
});

app.post("/components/iterate/description", async (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  const duplexStream = new PassThrough();
  duplexStream.pipe(res);
  const generated = await multipass.preset({
    stream: duplexStream,
    preset: `componentIterate_description`,
    query: {
      description: req.body.description,
      component: req.body.component,
      framework: req.body.framework,
      components: req.body.components,
      icons: req.body.icons,
    },
  });
  duplexStream.end();
});

/*
app.post('/stream_debug', async (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  const duplexStream = new PassThrough();
  async function generateText() {
    for (let i = 0; i < 300; i++) {
      const chunk = `Chunk ${i}\n`;
      duplexStream.write(chunk);
      await new Promise((resolve) => setTimeout(resolve, 10)); // Simulate work with a sleep
    }
  }
  duplexStream.pipe(res);
  await generateText();
  duplexStream.write("\n");
  duplexStream.end();
});
*/

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
