import * as expressCore from 'express-serve-static-core';

declare module 'express' {
  // Export the types directly
  export type Request = expressCore.Request;
  export type Response = expressCore.Response;
  export type NextFunction = expressCore.NextFunction;
  export type Application = expressCore.Application;
  export type Router = expressCore.Router;
  
  // Export the functions
  export function Router(): Router;
  export function static(root: string, options?: any): expressCore.RequestHandler;
  
  // Define the default export
  const express: {
    (): Application;
    Router: typeof Router;
    static: typeof static;
  };
  
  export default express;
}