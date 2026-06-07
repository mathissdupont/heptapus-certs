backend-1  | INFO:     172.18.0.6:40194 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:56382 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:56368 - "GET /api/admin/organization/contexts HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:40194 - "GET /api/admin/analytics/org/overview?days=30 HTTP/1.1" 500 Internal Server Error
backend-1  | INFO:     172.18.0.6:56398 - "GET /api/admin/analytics/org/cert-timeline?days=30 HTTP/1.1" 200 OK
backend-1  | ERROR:    Exception in ASGI application
backend-1  |   + Exception Group Traceback (most recent call last):
backend-1  |   |   File "/usr/local/lib/python3.12/site-packages/starlette/_utils.py", line 81, in collapse_excgroups
backend-1  |   |     yield
backend-1  |   |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 192, in __call__
backend-1  |   |     async with anyio.create_task_group() as task_group:
backend-1  |   |                ^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   |   File "/usr/local/lib/python3.12/site-packages/anyio/_backends/_asyncio.py", line 799, in __aexit__
backend-1  |   |     raise BaseExceptionGroup(
backend-1  |   | ExceptionGroup: unhandled errors in a TaskGroup (1 sub-exception)
backend-1  |   +-+---------------- 1 ----------------
backend-1  |     | Traceback (most recent call last):
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/uvicorn/protocols/http/httptools_impl.py", line 401, in run_asgi
backend-1  |     |     result = await app(  # type: ignore[func-returns-value]
backend-1  |     |              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/uvicorn/middleware/proxy_headers.py", line 70, in __call__
backend-1  |     |     return await self.app(scope, receive, send)
backend-1  |     |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/fastapi/applications.py", line 1159, in __call__
backend-1  |     |     await super().__call__(scope, receive, send)
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/applications.py", line 90, in __call__
backend-1  |     |     await self.middleware_stack(scope, receive, send)
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/errors.py", line 186, in __call__
backend-1  |     |     raise exc
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/errors.py", line 164, in __call__
backend-1  |     |     await self.app(scope, receive, _send)
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 191, in __call__
backend-1  |     |     with recv_stream, send_stream, collapse_excgroups():
backend-1  |     |                                    ^^^^^^^^^^^^^^^^^^^^
backend-1  |     |   File "/usr/local/lib/python3.12/contextlib.py", line 158, in __exit__
backend-1  |     |     self.gen.throw(value)
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/_utils.py", line 87, in collapse_excgroups
backend-1  |     |     raise exc
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 193, in __call__
backend-1  |     |     response = await self.dispatch_func(request, call_next)
backend-1  |     |                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |     |   File "/app/src/product_observability.py", line 23, in product_response_time_logger
backend-1  |     |     response = await call_next(request)
backend-1  |     |                ^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 168, in call_next
backend-1  |     |     raise app_exc from app_exc.__cause__ or app_exc.__context__
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 144, in coro
backend-1  |     |     await self.app(scope, receive_or_disconnect, send_no_error)
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 191, in __call__
backend-1  |     |     with recv_stream, send_stream, collapse_excgroups():
backend-1  |     |                                    ^^^^^^^^^^^^^^^^^^^^
backend-1  |     |   File "/usr/local/lib/python3.12/contextlib.py", line 158, in __exit__
backend-1  |     |     self.gen.throw(value)
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/_utils.py", line 87, in collapse_excgroups
backend-1  |     |     raise exc
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 193, in __call__
backend-1  |     |     response = await self.dispatch_func(request, call_next)
backend-1  |     |                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |     |   File "/app/src/main.py", line 5647, in organization_middleware
backend-1  |     |     response = await call_next(request)
backend-1  |     |                ^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 168, in call_next
backend-1  |     |     raise app_exc from app_exc.__cause__ or app_exc.__context__
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 144, in coro
backend-1  |     |     await self.app(scope, receive_or_disconnect, send_no_error)
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 191, in __call__
backend-1  |     |     with recv_stream, send_stream, collapse_excgroups():
backend-1  |     |                                    ^^^^^^^^^^^^^^^^^^^^
backend-1  |     |   File "/usr/local/lib/python3.12/contextlib.py", line 158, in __exit__
backend-1  |     |     self.gen.throw(value)
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/_utils.py", line 87, in collapse_excgroups
backend-1  |     |     raise exc
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 193, in __call__
backend-1  |     |     response = await self.dispatch_func(request, call_next)
backend-1  |     |                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |     |   File "/app/src/main.py", line 5591, in security_headers_middleware
backend-1  |     |     response = await call_next(request)
backend-1  |     |                ^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 168, in call_next
backend-1  |     |     raise app_exc from app_exc.__cause__ or app_exc.__context__
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 144, in coro
backend-1  |     |     await self.app(scope, receive_or_disconnect, send_no_error)
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/cors.py", line 88, in __call__
backend-1  |     |     await self.app(scope, receive, send)
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/exceptions.py", line 63, in __call__
backend-1  |     |     await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app
backend-1  |     |     raise exc
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/_exception_handler.py", line 42, in wrapped_app
backend-1  |     |     await app(scope, receive, sender)
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/fastapi/middleware/asyncexitstack.py", line 18, in __call__
backend-1  |     |     await self.app(scope, receive, send)
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/routing.py", line 660, in __call__
backend-1  |     |     await self.middleware_stack(scope, receive, send)
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/routing.py", line 680, in app
backend-1  |     |     await route.handle(scope, receive, send)
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/routing.py", line 276, in handle
backend-1  |     |     await self.app(scope, receive, send)
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/fastapi/routing.py", line 134, in app
backend-1  |     |     await wrap_app_handling_exceptions(app, request)(scope, receive, send)
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app
backend-1  |     |     raise exc
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/starlette/_exception_handler.py", line 42, in wrapped_app
backend-1  |     |     await app(scope, receive, sender)
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/fastapi/routing.py", line 120, in app
backend-1  |     |     response = await f(request)
backend-1  |     |                ^^^^^^^^^^^^^^^^
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/fastapi/routing.py", line 674, in app
backend-1  |     |     raw_response = await run_endpoint_function(
backend-1  |     |                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |     |   File "/usr/local/lib/python3.12/site-packages/fastapi/routing.py", line 328, in run_endpoint_function
backend-1  |     |     return await dependant.call(**values)
backend-1  |     |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |     |   File "/app/src/org_analytics_api.py", line 109, in org_overview
backend-1  |     |     Attendee.created_at >= since,
backend-1  |     |     ^^^^^^^^^^^^^^^^^^^
backend-1  |     | AttributeError: type object 'Attendee' has no attribute 'created_at'
backend-1  |     +------------------------------------
backend-1  |
backend-1  | The above exception was the direct cause of the following exception:
backend-1  |
backend-1  | Traceback (most recent call last):
backend-1  |   File "/usr/local/lib/python3.12/site-packages/uvicorn/protocols/http/httptools_impl.py", line 401, in run_asgi
backend-1  |     result = await app(  # type: ignore[func-returns-value]
backend-1  |              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/uvicorn/middleware/proxy_headers.py", line 70, in __call__
backend-1  |     return await self.app(scope, receive, send)
backend-1  |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/fastapi/applications.py", line 1159, in __call__
backend-1  |     await super().__call__(scope, receive, send)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/applications.py", line 90, in __call__
backend-1  |     await self.middleware_stack(scope, receive, send)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/errors.py", line 186, in __call__
backend-1  |     raise exc
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/errors.py", line 164, in __call__
backend-1  |     await self.app(scope, receive, _send)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 191, in __call__
backend-1  |     with recv_stream, send_stream, collapse_excgroups():
backend-1  |                                    ^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/contextlib.py", line 158, in __exit__
backend-1  |     self.gen.throw(value)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/_utils.py", line 87, in collapse_excgroups
backend-1  |     raise exc
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 193, in __call__
backend-1  |     response = await self.dispatch_func(request, call_next)
backend-1  |                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/app/src/product_observability.py", line 23, in product_response_time_logger
backend-1  |     response = await call_next(request)
backend-1  |                ^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 168, in call_next
backend-1  |     raise app_exc from app_exc.__cause__ or app_exc.__context__
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 144, in coro
backend-1  |     await self.app(scope, receive_or_disconnect, send_no_error)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 191, in __call__
backend-1  |     with recv_stream, send_stream, collapse_excgroups():
backend-1  |                                    ^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/contextlib.py", line 158, in __exit__
backend-1  |     self.gen.throw(value)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/_utils.py", line 87, in collapse_excgroups
backend-1  |     raise exc
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 193, in __call__
backend-1  |     response = await self.dispatch_func(request, call_next)
backend-1  |                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/app/src/main.py", line 5647, in organization_middleware
backend-1  |     response = await call_next(request)
backend-1  |                ^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 168, in call_next
backend-1  |     raise app_exc from app_exc.__cause__ or app_exc.__context__
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 144, in coro
backend-1  |     await self.app(scope, receive_or_disconnect, send_no_error)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 191, in __call__
backend-1  |     with recv_stream, send_stream, collapse_excgroups():
backend-1  |                                    ^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/contextlib.py", line 158, in __exit__
backend-1  |     self.gen.throw(value)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/_utils.py", line 87, in collapse_excgroups
backend-1  |     raise exc
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 193, in __call__
backend-1  |     response = await self.dispatch_func(request, call_next)
backend-1  |                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/app/src/main.py", line 5591, in security_headers_middleware
backend-1  |     response = await call_next(request)
backend-1  |                ^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 168, in call_next
backend-1  |     raise app_exc from app_exc.__cause__ or app_exc.__context__
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 144, in coro
backend-1  |     await self.app(scope, receive_or_disconnect, send_no_error)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/cors.py", line 88, in __call__
backend-1  |     await self.app(scope, receive, send)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/middleware/exceptions.py", line 63, in __call__
backend-1  |     await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app
backend-1  |     raise exc
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/_exception_handler.py", line 42, in wrapped_app
backend-1  |     await app(scope, receive, sender)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/fastapi/middleware/asyncexitstack.py", line 18, in __call__
backend-1  |     await self.app(scope, receive, send)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/routing.py", line 660, in __call__
backend-1  |     await self.middleware_stack(scope, receive, send)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/routing.py", line 680, in app
backend-1  |     await route.handle(scope, receive, send)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/routing.py", line 276, in handle
backend-1  |     await self.app(scope, receive, send)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/fastapi/routing.py", line 134, in app
backend-1  |     await wrap_app_handling_exceptions(app, request)(scope, receive, send)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app
backend-1  |     raise exc
backend-1  |   File "/usr/local/lib/python3.12/site-packages/starlette/_exception_handler.py", line 42, in wrapped_app
backend-1  |     await app(scope, receive, sender)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/fastapi/routing.py", line 120, in app
backend-1  |     response = await f(request)
backend-1  |                ^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/fastapi/routing.py", line 674, in app
backend-1  |     raw_response = await run_endpoint_function(
backend-1  |                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/fastapi/routing.py", line 328, in run_endpoint_function
backend-1  |     return await dependant.call(**values)
backend-1  |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/app/src/org_analytics_api.py", line 109, in org_overview
backend-1  |     Attendee.created_at >= since,
backend-1  |     ^^^^^^^^^^^^^^^^^^^
backend-1  | AttributeError: type object 'Attendee' has no attribute 'created_at'
backend-1  | INFO:     172.18.0.6:56398 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:56398 - "GET /api/admin/analytics/org/training-compliance HTTP/1.1" 200 OK
backend-1  | INFO:     127.0.0.1:58648 - "GET /api/health HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:56398 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:56398 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:56398 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:56398 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     127.0.0.1:38132 - "GET /api/health HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:38726 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:38726 - "GET /api/admin/analytics/org/learning-paths HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:38726 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:38726 - "GET /api/admin/analytics/org/crm HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:38726 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:38726 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:37556 - "GET /api/admin/organization/contexts HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:38726 - "GET /api/admin/organization/contexts HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:37550 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:37556 - "GET /api/me HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:38726 - "GET /api/admin/organization/venues HTTP/1.1" 200 OK
backend-1  | INFO:     127.0.0.1:49926 - "GET /api/health HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:37550 - "GET /api/admin/events HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:38726 - "GET /api/billing/subscription HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:37550 - "GET /api/admin/dashboard/stats HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:37550 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:37556 - "GET /api/admin/events/9/access HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:57344 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:38726 - "GET /api/admin/organization/contexts HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:37550 - "GET /api/admin/events/9 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:37550 - "GET /api/admin/events/9 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:38726 - "GET /api/admin/events/9/access HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:37550 - "GET /api/admin/events/9/health HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:37550 - "GET /api/admin/events/9/team/activity HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:37550 - "GET /api/admin/events/9 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:38726 - "GET /api/admin/events/9/access HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:37556 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:57344 - "GET /api/admin/organization/contexts HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:57344 - "GET /api/admin/events/9/access HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:38726 - "GET /api/admin/events/9 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:57344 - "GET /api/admin/events/9/microsoft-excel HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:57352 - "GET /api/admin/events/9/sheets HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:37556 - "GET /api/admin/events/9 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:37556 - "GET /api/admin/events/9/access HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:37550 - "GET /api/admin/events/9/attendees?page=1&limit=50 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:37550 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:37550 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:57378 - "GET /api/admin/organization/contexts HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:37550 - "GET /api/admin/organization/contexts HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:57364 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     127.0.0.1:52418 - "GET /api/health HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:57364 - "GET /api/admin/events HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:57378 - "GET /api/admin/organization/venues HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:37550 - "GET /api/me HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:57378 - "GET /api/billing/subscription HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:37550 - "GET /api/admin/dashboard/stats HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:37550 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:57378 - "GET /api/admin/events/36/access HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:37550 - "GET /api/admin/events/36 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:57364 - "GET /api/admin/organization/contexts HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:57388 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:37550 - "GET /api/admin/events/36 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:57388 - "GET /api/admin/events/36/access HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:57364 - "GET /api/admin/events/36/health HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:57364 - "GET /api/admin/events/36/team/activity HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:57364 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:57364 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:57364 - "GET /api/admin/events/36/access HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:57388 - "GET /api/admin/events/36 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:37550 - "GET /api/admin/organization/contexts HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:57378 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:37550 - "GET /api/admin/events/36/access HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:57378 - "GET /api/admin/events/36/quiz HTTP/1.1" 404 Not Found
backend-1  | INFO:     127.0.0.1:48420 - "GET /api/health HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:57378 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:38814 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     127.0.0.1:54196 - "GET /api/health HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:60362 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     127.0.0.1:52914 - "GET /api/health HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:57426 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     127.0.0.1:56364 - "GET /api/health HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:33492 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     127.0.0.1:33592 - "GET /api/health HTTP/1.1" 200 OK
backend-1  | INFO:     172.18.0.6:43006 - "POST /api/admin/events/36/quiz HTTP/1.1" 422 Unprocessable Entity
backend-1  | INFO:     172.18.0.6:43006 - "GET /api/admin/jobs?limit=1 HTTP/1.1" 200 OK
backend-1  | INFO:     127.0.0.1:57674 - "GET /api/health HTTP/1.1" 200 OK
root@heptapusgroup-dev-server:/srv/heptapus-certs/heptacert#