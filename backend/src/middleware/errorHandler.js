export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const map = {
    VALIDATION_ERROR: { status: 400, message: "Please check the submitted values." },
    INVALID_BUDGET: { status: 400, message: "Please enter a valid budget greater than zero." },
    MISSING_BUDGET: { status: 400, message: "Budget is required." },
    MISSING_ITEMS: { status: 400, message: "Tell me which products you need." },
    INVALID_IMAGE: { status: 400, message: "Please upload a JPEG, PNG, WebP, or GIF image." },
    LLM_FAILURE: { status: 502, message: "The language model is unavailable right now." },
    VISION_FAILURE: { status: 502, message: "Image analysis failed. Try another photo." },
    PRODUCT_API_FAILURE: { status: 502, message: "The product catalog could not be loaded." },
    NETWORK_FAILURE: { status: 503, message: "Network failure while contacting a dependency." }
  };

  const known = map[err.message];
  res.status(known?.status || 500).json({
    error: err.message || "SERVER_ERROR",
    message: known?.message || "Something went wrong. Please try again.",
    details: err.details || undefined
  });
}
