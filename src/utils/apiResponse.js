/**
 * Consistent API Response Formatter
 */
class ApiResponse {
  static success(res, payload = {}, message = null, statusCode = 200) {
    // If payload contains root entities like user, policies, summary, etc., merge at root
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      if (payload.user !== undefined || payload.summary !== undefined || payload.entities !== undefined || payload.data !== undefined) {
        return res.status(statusCode).json({
          success: true,
          ...(message && { message }),
          ...payload
        });
      }
    }

    return res.status(statusCode).json({
      success: true,
      ...(message && { message }),
      data: payload
    });
  }

  static created(res, payload = {}, message = 'Resource created successfully') {
    return ApiResponse.success(res, payload, message, 201);
  }
}

module.exports = ApiResponse;
