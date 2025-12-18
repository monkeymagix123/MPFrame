const isDev: boolean = process.env.NODE_ENV === "development";

export const serverConfig = {
   port: isDev ? 3001 : 3000,

   simulationRate: 60,
};