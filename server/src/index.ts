import "dotenv/config";
import { createApp } from "./app";

const port = Number(process.env.PORT ?? 5000);
const app = createApp();

app.listen(port, () => {
  console.log(`TaskFlow API listening on ${port}`);
});
