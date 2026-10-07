import type { ErrorRequestHandler, RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
  }
}

export const requestId: RequestHandler = (request, response, next) => {
  const id = request.header("x-request-id") || randomUUID();
  response.setHeader("x-request-id", id);
  response.locals.requestId = id;
  next();
};

export const notFound: RequestHandler = (request, _response, next) =>
  next(
    new HttpError(
      404,
      `Route not found: ${request.method} ${request.originalUrl}`,
      "not_found",
    ),
  );

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  const duplicate =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505";
  const uploadTooLarge =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "LIMIT_FILE_SIZE";
  const status =
    error instanceof HttpError
      ? error.status
      : error instanceof ZodError
        ? 400
        : uploadTooLarge
          ? 413
        : duplicate
          ? 409
          : 500;
  const message =
    error instanceof HttpError
      ? error.message
      : error instanceof ZodError
        ? error.issues[0]?.message || "Invalid request"
        : uploadTooLarge
          ? "Uploaded file exceeds the 20 MB limit"
        : duplicate
          ? "A record with these values already exists"
          : "Internal server error";
  response.status(status).json({
    error: message,
    ...(error instanceof HttpError && error.code ? { code: error.code } : {}),
    requestId: response.locals.requestId,
  });
};
