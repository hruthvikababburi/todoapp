const express = require("express");
const app = express();

app.use(express.json());

var format = require("date-fns/format");
var isValid = require("date-fns/isValid");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const path = require("path");
const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;
const initializingDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
    process.exit(1);
  }
};
initializingDbAndServer();

const responseObjTodos = (obj) => {
  return {
    id: obj.id,
    todo: obj.todo,
    priority: obj.priority,
    status: obj.status,
    category: obj.category,
    dueDate: obj.due_date,
  };
};

const hasOnlyStatus = (requestQuery) => {
  return (
    requestQuery.status !== undefined &&
    requestQuery.priority === undefined &&
    requestQuery.search_q === undefined &&
    requestQuery.category === undefined
  );
};
const hasOnlyPriority = (requestQuery) => {
  return (
    requestQuery.priority !== undefined &&
    requestQuery.status === undefined &&
    requestQuery.search_q === undefined &&
    requestQuery.category === undefined
  );
};
const hasOnlySearch_q = (requestQuery) => {
  return (
    requestQuery.search_q !== undefined &&
    requestQuery.priority === undefined &&
    requestQuery.status === undefined &&
    requestQuery.category === undefined
  );
};
const hasOnlyCategory = (requestQuery) => {
  return (
    requestQuery.category !== undefined &&
    requestQuery.priority === undefined &&
    requestQuery.search_q === undefined &&
    requestQuery.status === undefined
  );
};
const hasBothStatusAndPriority = (requestQuery) => {
  return (
    requestQuery.status !== undefined &&
    requestQuery.priority !== undefined &&
    requestQuery.search_q === undefined &&
    requestQuery.category === undefined
  );
};
const hasBothCategoryAndStatus = (requestQuery) => {
  return (
    requestQuery.status !== undefined &&
    requestQuery.priority === undefined &&
    requestQuery.search_q === undefined &&
    requestQuery.category !== undefined
  );
};
const hasBothCategoryAndPriority = (requestQuery) => {
  return (
    requestQuery.priority !== undefined &&
    requestQuery.category === undefined &&
    requestQuery.search_q === undefined &&
    requestQuery.status === undefined
  );
};

//statusValid = ["TO DO", "IN PROGRESS", "DONE"];
//categoryValid = ["WORK", "HOME", "LEARNING"];
//priorityValid = ["HIGH", "MEDIUM", "LOW"];

//get todo
app.get("/todos/", async (request, response) => {
  const { status, priority, category, search_q } = request.query;
  //if (!(statusValid.includes(request.query.status)){
  //  response.status(400);
  //response.send("Invalid Todo Status");
  //}
  //if (!(priorityValid.includes(request.query.priority)){
  //  response.status(400);
  //response.send("Invalid Todo Priority");
  //}
  //if (!(categoryValid.includes(request.body.category)){
  //  response.status(400);
  //response.send("Invalid Todo Category");
  //}

  let getTodosQuery = "";

  switch (true) {
    case hasOnlyStatus(request.query):
      getTodosQuery = `
    SELECT *
    FROM todo
    WHERE status = '${status}';`;
      break;
    case hasOnlyPriority(request.query):
      getTodosQuery = `
      SELECT *
      FROM todo
      WHERE priority = '${priority}';`;
      break;
    case hasOnlyCategory(request.query):
      getTodosQuery = `
      SELECT *
      FROM todo
      WHERE category = '${category}';`;
      break;
    case hasOnlySearch_q(request.query):
      getTodosQuery = `
      SELECT *
      FROM todo
      WHERE todo LIKE '%${search_q}%';`;
      break;
    case hasBothStatusAndPriority(request.query):
      getTodosQuery = `
      SELECT *
      FROM todo
      WHERE status = '${status}' AND priority = '${priority}';`;
      break;
    case hasBothCategoryAndStatus(request.query):
      getTodosQuery = `
      SELECT *
      FROM todo
      WHERE status = '${status}' AND category = '${category}';`;
      break;
    default:
      getTodosQuery = `
      SELECT *
      FROM todo
      WHERE priority = '${priority}' AND category = '${category}';`;
      break;
  }
  const getTodos = await db.all(getTodosQuery);
  response.send(getTodos);
});

//get todo by Id
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT *
    FROM todo
    WHERE id = ${todoId};`;
  const getTodo = await db.get(getTodoQuery);
  response.send(responseObjTodos(getTodo));
});

//get todo by date
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;

  const dueDate = format(date, "yyyy-MM-dd");
  if (isValid(dueDate)) {
    const getTodoByDateQuery = `
    SELECT *
    FROM todo
    WHERE due_date = ${dueDate};`;
    const getTodoByDate = await db.all(getTodoByDateQuery);
    response.send(getTodoByDate);
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

//create todo
app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const createTodoQuery = `
    INSERT INTO todo
    (id,todo,priority,status,category,due_date)
    VALUES(${id},'${todo}','${priority}','${status}','${category}',${dueDate});`;
  const createTodo = await db.run(createTodoQuery);
  response.send("Todo Successfully Added");
});

//update todo
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  let updatedCol = "";

  switch (true) {
    case request.body.status !== undefined:
      updatedCol = "Status";
      break;
    case request.body.priority !== undefined:
      updatedCol = "Priority";
      break;
    case request.body.todo !== undefined:
      updatedCol = "Todo";
      break;
    case request.body.category !== undefined:
      updatedCol = "Category";
      break;

    default:
      updatedCol = "Due Date";
      break;
  }

  const previousTodoDetailsQuery = `
  SELECT *
  FROM todo
  WHERE id = ${todoId};`;
  const previousTodoDetails = await db.get(previousTodoDetailsQuery);

  const {
    status = previousTodoDetails.status,
    priority = previousTodoDetails.priority,
    todo = previousTodoDetails.todo,
    category = previousTodoDetails.category,
    dueDate = previousTodoDetails.due_date,
  } = request.body;

  const updatingTodoQuery = `
  UPDATE todo
  SET status = '${status}', priority = '${priority}', category = '${category}', todo = '${todo}', due_date = ${dueDate}
  WHERE id = ${todoId};`;
  const updateTodo = await db.run(updatingTodoQuery);
  response.send(`${updatedCol} Updated`);
});

//delete todo
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
    DELETE FROM todo
    WHERE id = ${todoId};`;
  const deleteTodo = await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

//export express instance
module.exports = app;
