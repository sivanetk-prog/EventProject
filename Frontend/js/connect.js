fetch(`${API_BASE_URL}/health`)
    .then((http_response) => http_response.json())
    .then((health_response) => {
        console.log('health_response:', health_response);
    })
    .catch((connection_error) => {
        console.error('connection_error:', connection_error);
    });
