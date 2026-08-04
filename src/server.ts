import "dotenv/config";
import { createApp } from "./app";

const PORT = process.env.PORT;

const app = createApp();

app.listen(PORT, () => {
  console.log(`dropline-api listening on port ${PORT}`);
});
