# Hata Günlüğü

## ✅ ÇÖZÜLDÜ — DuplicateTableError: ix_lms_journeys_org_id (2026-06-08)

**Hata:**

```text
sqlalchemy.exc.ProgrammingError: relation "ix_lms_journeys_org_id" already exists
[SQL: CREATE INDEX ix_lms_journeys_org_id ON lms_journeys (org_id)]
```

**Sebep:**
`main.py` startup handler'ında `Base.metadata.create_all` `checkfirst=True` olmadan çağrılıyordu.
LMS modelleri import edildiğinde SQLAlchemy var olan index'leri yeniden oluşturmaya çalışıyor, crash oluyordu.

**Çözüm (main.py ~5710):**

```python
# ESKİ (bozuk)
await conn.run_sync(Base.metadata.create_all)

# YENİ (düzeltilmiş)
await conn.run_sync(lambda conn: Base.metadata.create_all(conn, checkfirst=True))
```

Backend artık başarıyla başlıyor.



//
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.0.3, pluggy-1.6.0 -- /opt/hostedtoolcache/Python/3.12.13/x64/bin/python
cachedir: .pytest_cache
rootdir: /home/runner/work/heptapus-certs/heptapus-certs/heptacert/backend
configfile: pytest.ini
plugins: asyncio-1.3.0, cov-6.0.0, anyio-4.13.0
asyncio: mode=Mode.AUTO, debug=False, asyncio_default_fixture_loop_scope=session, asyncio_default_test_loop_scope=function
collecting ... collected 402 items

tests/test_api.py::TestHealthEndpoint::test_health_returns_ok ERROR      [  0%]

==================================== ERRORS ====================================
_________ ERROR at setup of TestHealthEndpoint.test_health_returns_ok __________
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/engine/base.py:1967: in _exec_single_context
    self.dialect.do_execute(
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/engine/default.py:941: in do_execute
    cursor.execute(statement, parameters)
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/dialects/sqlite/aiosqlite.py:147: in execute
    self._adapt_connection._handle_exception(error)
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/dialects/sqlite/aiosqlite.py:298: in _handle_exception
    raise error
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/dialects/sqlite/aiosqlite.py:129: in execute
    self.await_(_cursor.execute(operation, parameters))
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/util/_concurrency_py3k.py:132: in await_only
    return current.parent.switch(awaitable)  # type: ignore[no-any-return,attr-defined] # noqa: E501
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/util/_concurrency_py3k.py:196: in greenlet_spawn
    value = await result
            ^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/aiosqlite/cursor.py:48: in execute
    await self._execute(self._cursor.execute, sql, parameters)
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/aiosqlite/cursor.py:40: in _execute
    return await self._conn._execute(fn, *args, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/aiosqlite/core.py:132: in _execute
    return await future
           ^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/aiosqlite/core.py:115: in run
    result = function()
             ^^^^^^^^^^
E   sqlite3.OperationalError: index ix_learning_paths_org_id already exists

The above exception was the direct cause of the following exception:
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/pytest_asyncio/plugin.py:458: in setup
    return super().setup()
           ^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/pytest_asyncio/plugin.py:743: in pytest_fixture_setup
    hook_result = yield
                  ^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/pytest_asyncio/plugin.py:313: in _asyncgen_fixture_wrapper
    result = runner.run(setup(), context=context)
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/asyncio/runners.py:118: in run
    return self._loop.run_until_complete(task)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/asyncio/base_events.py:691: in run_until_complete
    return future.result()
           ^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/pytest_asyncio/plugin.py:309: in setup
    res = await gen_obj.__anext__()
          ^^^^^^^^^^^^^^^^^^^^^^^^^
tests/conftest.py:31: in setup_database
    await conn.run_sync(Base.metadata.create_all)
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/ext/asyncio/engine.py:886: in run_sync
    return await greenlet_spawn(
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/util/_concurrency_py3k.py:201: in greenlet_spawn
    result = context.throw(*sys.exc_info())
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/schema.py:5868: in create_all
    bind._run_ddl_visitor(
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/engine/base.py:2459: in _run_ddl_visitor
    visitorcallable(self.dialect, self, **kwargs).traverse_single(element)
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/visitors.py:664: in traverse_single
    return meth(obj, **kw)
           ^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/ddl.py:918: in visit_metadata
    self.traverse_single(
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/visitors.py:664: in traverse_single
    return meth(obj, **kw)
           ^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/ddl.py:960: in visit_table
    self.traverse_single(index, create_ok=True)
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/visitors.py:664: in traverse_single
    return meth(obj, **kw)
           ^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/ddl.py:997: in visit_index
    CreateIndex(index)._invoke_with(self.connection)
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/ddl.py:314: in _invoke_with
    return bind.execute(self)
           ^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/engine/base.py:1418: in execute
    return meth(
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/ddl.py:180: in _execute_on_connection
    return connection._execute_ddl(
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/engine/base.py:1529: in _execute_ddl
    ret = self._execute_context(
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/engine/base.py:1846: in _execute_context
    return self._exec_single_context(
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/engine/base.py:1986: in _exec_single_context
    self._handle_dbapi_exception(
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/engine/base.py:2355: in _handle_dbapi_exception
    raise sqlalchemy_exception.with_traceback(exc_info[2]) from e
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/engine/base.py:1967: in _exec_single_context
    self.dialect.do_execute(
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/engine/default.py:941: in do_execute
    cursor.execute(statement, parameters)
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/dialects/sqlite/aiosqlite.py:147: in execute
    self._adapt_connection._handle_exception(error)
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/dialects/sqlite/aiosqlite.py:298: in _handle_exception
    raise error
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/dialects/sqlite/aiosqlite.py:129: in execute
    self.await_(_cursor.execute(operation, parameters))
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/util/_concurrency_py3k.py:132: in await_only
    return current.parent.switch(awaitable)  # type: ignore[no-any-return,attr-defined] # noqa: E501
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/util/_concurrency_py3k.py:196: in greenlet_spawn
    value = await result
            ^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/aiosqlite/cursor.py:48: in execute
    await self._execute(self._cursor.execute, sql, parameters)
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/aiosqlite/cursor.py:40: in _execute
    return await self._conn._execute(fn, *args, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/aiosqlite/core.py:132: in _execute
    return await future
           ^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/aiosqlite/core.py:115: in run
    result = function()
             ^^^^^^^^^^
E   sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) index ix_learning_paths_org_id already exists
E   [SQL: CREATE INDEX ix_learning_paths_org_id ON learning_paths (org_id)]
E   (Background on this error at: https://sqlalche.me/e/20/e3q8)
=============================== warnings summary ===============================
../../../../../../../opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/passlib/utils/__init__.py:854
  /opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/passlib/utils/__init__.py:854: DeprecationWarning: 'crypt' is deprecated and slated for removal in Python 3.13
    from crypt import crypt as _crypt

src/main.py:5707
  /home/runner/work/heptapus-certs/heptapus-certs/heptacert/backend/src/main.py:5707: DeprecationWarning: 
          on_event is deprecated, use lifespan event handlers instead.
  
          Read more about it in the
          [FastAPI docs for Lifespan Events](https://fastapi.tiangolo.com/advanced/events/).
          
    @app.on_event("startup")

../../../../../../../opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/fastapi/applications.py:4598
  /opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/fastapi/applications.py:4598: DeprecationWarning: 
          on_event is deprecated, use lifespan event handlers instead.
  
          Read more about it in the
          [FastAPI docs for Lifespan Events](https://fastapi.tiangolo.com/advanced/events/).
          
    return self.router.on_event(event_type)  # ty: ignore[deprecated]

../../../../../../../opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/pydantic/_internal/_config.py:291
../../../../../../../opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/pydantic/_internal/_config.py:291
../../../../../../../opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/pydantic/_internal/_config.py:291
  /opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/pydantic/_internal/_config.py:291: PydanticDeprecatedSince20: Support for class-based `config` is deprecated, use ConfigDict instead. Deprecated in Pydantic V2.0 to be removed in V3.0. See Pydantic V2 Migration Guide at https://errors.pydantic.dev/2.9/migration/
    warnings.warn(DEPRECATION_MESSAGE, DeprecationWarning)

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html

---------- coverage: platform linux, python 3.12.13-final-0 ----------
Name                                   Stmts   Miss  Cover   Missing
--------------------------------------------------------------------
src/accreditation_api.py                 143     79    45%   36, 45-46, 74-80, 104-113, 127-142, 156-171, 184-190, 214, 233-242, 256-282, 290-296, 308-335
src/accreditation_models.py               47      0   100%
src/analytics_api.py                     174    151    13%   43-81, 98-188, 223-254, 271-319, 336-400, 427-476, 490-549
src/api_keys_ext_api.py                   71     33    54%   69, 81-88, 102-130, 144-161, 165
src/audience_segments_api.py             536    404    25%   154-160, 164-165, 169, 177-179, 183-185, 189-224, 234-239, 243-252, 264-331, 343, 363-364, 376-411, 424-426, 430-474, 484, 496-499, 503, 517, 537, 546-557, 561-565, 569, 573-577, 581-585, 589-594, 598-611, 615-642, 658-700, 713-724, 739-767, 780-786, 802-837, 850-859, 872-881, 900-959, 978-1000, 1020-1033, 1063-1103, 1111-1235, 1261-1296
src/auth_2fa_api.py                      155     99    36%   32, 36, 65-68, 72-76, 80-81, 85, 89-106, 114-125, 134-160, 169-186, 196, 206, 216-234, 239-246, 257-274, 283-290, 301-318
src/automation_api.py                    428    308    28%   105, 165, 169, 173, 186-189, 199-202, 216-222, 226-231, 235-288, 298, 307-308, 312-313, 317-319, 323-336, 340-342, 346-365, 376-399, 403-460, 464-474, 478-480, 500-514, 518-550, 554, 559-686, 691-694, 697-698, 701, 705, 718-720, 729-742, 760-776, 791-804, 818-837, 850-851, 855, 869-883, 904-944
src/badge_template_seeds.py               22     22     0%   15-196
src/cache.py                              50     50     0%   12-86
src/certificate_template_seeds.py         36     36     0%   13-320
src/certificate_templates_api.py         153     97    37%   65-80, 84-91, 95, 99-103, 107-112, 116, 138-140, 155-189, 203-224, 237-242, 256-271, 284-289, 302-309, 321-334
src/checkin_ops_api.py                   222    136    39%   43-47, 111, 115-123, 127-141, 145-157, 161, 190, 220-226, 240-257, 270-279, 293-300, 314-333, 357-449, 497-527, 559-580
src/community_api.py                      94     78    17%   36-50, 54-56, 66-98, 108-145, 188-207, 217-237
src/community_notifications.py            25     25     0%   1-70
src/connections_api.py                   209    108    48%   137, 141-146, 153, 168-208, 227-246, 262-284, 303-325, 342-389, 411-450, 464-483, 491, 500-516
src/crm_accounts_api.py                  269    150    44%   34-39, 132-135, 139-149, 153-154, 174, 182, 213-221, 236-252, 266-268, 283-297, 310-314, 330-353, 369-392, 415-422, 438-447, 460-482, 498-514, 529-543, 556-562, 578-589, 612-626, 644-653
src/crm_accounts_models.py                55      0   100%
src/crm_sequences_api.py                 236    136    42%   31, 35-38, 136, 140-147, 151-158, 162-164, 188-196, 211-231, 246-268, 281-287, 302-338, 352-373, 389-397, 408-451
src/crm_snapshot_hooks.py                 98     98     0%   3-222
src/document_export_jobs.py              215    139    35%   95, 112-117, 127-163, 172-176, 185, 194-202, 206-225, 230-233, 236, 240-281, 285-324, 328-341, 345-351, 355-366
src/document_outputs.py                  234    196    16%   25-29, 33, 58-59, 74-90, 94-98, 102-110, 120-129, 147-194, 198-208, 212-234, 252-277, 281, 285-298, 302-309, 313-331, 335-357, 361, 365-368, 372, 384-399, 410-413, 424-425, 429-435
src/document_outputs_api.py               27      5    81%   33-48, 56-68
src/domains.py                            54     24    56%   37-41, 45-47, 51-53, 57-63, 67-72
src/domains_api.py                       165    108    35%   32-37, 41-58, 62-65, 75-78, 101-102, 106, 120-134, 139-141, 146-150, 155-164, 169-176, 185-188, 197-206, 211-241, 245-251
src/email_api.py                         625    506    19%   81-119, 145-177, 190-213, 230-237, 253-268, 284-300, 314-325, 341-394, 409-415, 430, 444-469, 481-484, 509-543, 566-641, 656-665, 679-686, 708-796, 819-829, 857-873, 889-917, 932-950, 979-998, 1030-1090, 1112-1179, 1198-1206, 1224-1249, 1265-1287, 1315-1331, 1342-1358, 1367-1375, 1387-1388, 1401-1412, 1425-1433, 1446-1456, 1471-1473, 1491-1497, 1514-1662, 1674-1689, 1701-1726, 1732, 1762-1776, 1788-1789, 1798, 1802-1816, 1828-1829, 1838
src/email_rendering.py                    38     27    29%   13, 17, 21-23, 27-32, 47-63, 88
src/email_template_presets.py              6      0   100%
src/event_crm_api.py                    1069    778    27%   212, 216, 220, 224, 237, 250-253, 257, 261-264, 268-275, 279-288, 292-307, 322-398, 402-408, 412-425, 429-430, 434-437, 441, 445-446, 450-451, 455-459, 463-468, 472-484, 488-507, 511-521, 525-533, 544-591, 604-624, 642-653, 668-681, 696-706, 719-725, 743-865, 879-945, 971-972, 985-988, 1006-1016, 1028-1032, 1044-1057, 1071-1111, 1125-1191, 1204-1261, 1275-1347, 1361-1382, 1396-1466, 1480-1487, 1513-1526, 1559-1622, 1646-1725, 1749-1758, 1790, 1794-1801, 1813-1833, 1846-1849, 1868-1877, 1889-1893, 1907-1977, 2008, 2012-2013, 2017-2018, 2031-2034, 2054-2064, 2076-2080, 2094-2163, 2191-2263, 2278-2279, 2295-2299
src/event_features.py                     37     23    38%   31-32, 36-48, 52-53, 57, 61, 65, 69, 73, 77
src/generator.py                         251    209    17%   53, 65-89, 96-112, 122-156, 166-298, 318-394, 412-427, 449-466
src/i18n.py                               16     11    31%   63-69, 74-77
src/lead_forms_api.py                    163     86    47%   35-38, 42-47, 116-124, 139-155, 169-171, 186-197, 210-214, 230-240, 247-252, 272-329, 335-338, 342-350, 354, 371
src/lead_forms_models.py                  35      0   100%
src/learning_path_api.py                 241    185    23%   72-76, 80-90, 94-104, 108, 127-144, 161-186, 197-205, 217-231, 244-253, 267-290, 302-308, 320-333, 364-391, 401-423, 433-535, 554-594
src/learning_path_models.py               50      0   100%
src/lms_api.py                           542    391    28%   121-214, 225-246, 255-274, 278, 294-300, 306-318, 329-353, 375-383, 407-429, 448-457, 473-481, 493-510, 522-523, 536-544, 556-559, 577-592, 606-621, 634-645, 662-695, 704-741, 750-784, 795-880, 889-897, 940, 964-972, 984-1001, 1013-1022, 1035-1064, 1076-1085, 1107-1114, 1132-1142, 1165-1178, 1206-1217, 1231-1254, 1263-1282, 1303-1336
src/lms_extended_api.py                  600    379    37%   70-76, 80-88, 94-110, 114-124, 155-161, 171-184, 195-207, 217-225, 235-242, 269-299, 303, 340-346, 356-367, 377-387, 398-418, 429-439, 443, 457, 508-513, 523-528, 539-558, 568-601, 611-619, 630-641, 645, 696-701, 710-721, 731-741, 750-756, 765-771, 788-804, 814-823, 827, 854-859, 878-888, 899-917, 928-936, 972-976, 985-998, 1008-1018, 1027-1033, 1043-1058, 1067-1077, 1081, 1122-1128, 1138-1152, 1162-1170, 1179-1183, 1193-1204, 1208, 1246-1253, 1262-1273, 1283-1288, 1297-1300, 1304, 1326-1384, 1410-1447, 1479-1484, 1493-1502, 1512-1531, 1542-1562, 1575-1580, 1594-1628
src/lms_extended_models.py               188      0   100%
src/lms_models.py                        159      0   100%
src/local_bootstrap.py                    46     46     0%   1-68
src/main.py                            10299   6993    32%   45-46, 50-51, 115-137, 142-144, 147-155, 158-163, 166-167, 170, 173, 176-178, 181-197, 205-227, 231-242, 320, 1013-1026, 1034-1059, 1066-1103, 1110-1143, 1147-1228, 2211-2214, 2225-2228, 2306-2315, 2319-2326, 2337-2340, 2345, 2356-2361, 2366, 2371-2376, 2665-2668, 3038-3056, 3090-3095, 3379, 3555-3558, 3561-3564, 3567-3570, 3574-3578, 3585-3589, 3593-3597, 3622, 3626, 3634-3636, 3640, 3645, 3649, 3666-3675, 3679-3684, 3688-3693, 3697, 3701-3721, 3725-3727, 3731-3735, 3739-3750, 3754-3757, 3761, 3789, 3793-3797, 3801-3803, 3807-3808, 3812-3814, 3818-3823, 3827-3828, 3832-3845, 3849-3856, 3860-3901, 3905, 3909, 3919-3935, 3939-3945, 3949-3953, 3957-3960, 3964-3973, 3977-3990, 3994-4007, 4016-4071, 4075-4090, 4094-4099, 4107, 4111-4115, 4119-4120, 4124-4126, 4130-4135, 4139-4140, 4144-4162, 4166-4173, 4177-4213, 4217-4238, 4242-4243, 4247-4259, 4263-4293, 4297-4302, 4306-4311, 4336, 4358-4412, 4420-4513, 4565-4782, 4786, 4790-4794, 4804-4885, 4889-4894, 4912-5008, 5019-5028, 5035-5038, 5042-5045, 5050-5053, 5057-5058, 5079, 5083-5156, 5163-5181, 5194-5199, 5206, 5211-5213, 5217-5223, 5227-5229, 5233-5241, 5250-5296, 5304-5325, 5333-5356, 5365-5390, 5394-5396, 5401-5420, 5424, 5433-5440, 5444-5449, 5456-5464, 5468-5483, 5487-5490, 5494-5511, 5522-5533, 5551-5553, 5567, 5593-5600, 5609-5695, 5700-5704, 5709-6614, 6619-6620, 6624, 6635-6653, 6678-6823, 6827-6918, 6922-6923, 6927-6930, 6934-6940, 6944-6945, 6949-6953, 6957-6965, 6969-6974, 6978-6983, 6987-6991, 7021-7022, 7026-7030, 7040, 7044, 7048, 7057-7059, 7063-7065, 7069-7071, 7075-7080, 7084, 7088-7102, 7106-7111, 7115-7120, 7124-7129, 7133-7136, 7145-7146, 7162-7248, 7252-7271, 7275-7318, 7322-7332, 7336-7337, 7341-7345, 7349-7356, 7360-7609, 7613-7630, 7636-7639, 7651-7684, 7694-7709, 7721-7769, 7777-7817, 7827-7857, 7875-7903, 7916-7941, 7955-7980, 7989-8019, 8029-8161, 8179-8207, 8217-8229, 8240-8280, 8294-8325, 8338-8398, 8408-8418, 8430-8527, 8536-8602, 8615-8635, 8670-8692, 8702-8717, 8734-8764, 8776-8798, 8810-8824, 8835, 8840-8872, 8899-9033, 9042-9091, 9100-9130, 9135-9158, 9164-9185, 9189-9192, 9196-9210, 9218-9229, 9234-9248, 9252, 9260-9278, 9287-9381, 9397-9401, 9421-9440, 9451-9517, 9533-9537, 9557-9575, 9586-9649, 9659-9694, 9700-9722, 9730-9753, 9759-9780, 9786-9805, 9811-9832, 9838-9856, 9862-9885, 10040-10041, 10045-10076, 10080-10084, 10088-10104, 10108-10109, 10113-10122, 10126-10142, 10146-10385, 10566-10584, 10588-10610, 10614-10737, 10741-10751, 10764-10769, 10784-10805, 10825-10849, 10862-10865, 10880-10901, 10914-10926, 10939-10977, 10985-10987, 11005-11019, 11038-11052, 11065-11073, 11083-11091, 11100-11107, 11112-11120, 11129-11141, 11147-11149, 11159-11163, 11168-11172, 11177-11186, 11227-11254, 11267-11269, 11274-11283, 11310, 11324-11390, 11405-11494, 11499-11503, 11511-11520, 11545-11549, 11566-11575, 11590-11592, 11601-11642, 11655-11694, 11706-11710, 11730-11734, 11743-11750, 11759-11781, 11802-11815, 11836-11879, 11903-11915, 11924-11946, 11954-11983, 12011-12017, 12026-12035, 12044-12070, 12075-12119, 12123-12133, 12137-12144, 12157-12220, 12231-12275, 12279-12280, 12314-12362, 12374-12386, 12390-12449, 12453-12472, 12487-12490, 12494, 12503-12527, 12537-12538, 12549-12682, 12712-12719, 12732-12762, 12783-12834, 12842-12884, 12906-12929, 12942-12959, 12963-12979, 12983-13003, 13016-13060, 13064-13068, 13091-13092, 13105-13107, 13120-13125, 13138-13143, 13147-13151, 13175-13176, 13189-13191, 13204-13209, 13222-13227, 13239-13401, 13411-13420, 13430-13471, 13481-13490, 13500-13532, 13547-13622, 13635-13642, 13656-13667, 13680-13698, 13711-13729, 13739-13866, 13909-13970, 14004-14016, 14019-14023, 14027-14029, 14038-14064, 14068-14088, 14092, 14104-14106, 14111-14147, 14157-14168, 14173-14175, 14193-14213, 14228-14234, 14241-14272, 14295-14358, 14377-14381, 14409-14584, 14599-14651, 14663-14682, 14696-14755, 14772-14822, 14843-14901, 14921-14972, 15002-15022, 15032-15071, 15088-15094, 15108-15128, 15136-15158, 15178-15186, 15199-15225, 15303-15304, 15308-15314, 15322-15342, 15357, 15399-15409, 15504-15506, 15510, 15526-15537, 15546-15560, 15564-15570, 15574-15575, 15579-15580, 15584-15585, 15589-15594, 15598, 15602-15625, 15629-15649, 15659-15679, 15683, 15698-15700, 15711-15712, 15727-15736, 15747-15751, 15755-15763, 15766-15780, 15785-15789, 15793-15808, 15812-15815, 15819-15829, 15833-15972, 15976-15977, 15981-16076, 16083-16096, 16106-16139, 16167-16179, 16185-16188, 16204, 16255, 16279-16348, 16378-16395, 16400-16411, 16423-16451, 16463-16488, 16493-16500, 16511-16538, 16542-16569, 16580-16632, 16650-17060, 17065-17139, 17156-17181, 17188-17195, 17219-17298, 17342-17390, 17401-17427, 17436-17443, 17452-17459, 17470-17493, 17504-17515, 17525-17544, 17555-17573, 17583-17591, 17601-17611, 17624-17664, 17680-17720, 17734-17842, 17859-17869, 17885-17993, 18012-18025, 18044-18051, 18062-18083, 18105-18130, 18152-18194, 18208-18264, 18290-18301, 18318-18390, 18401-18463, 18516-18546, 18559-18570, 18583-18595, 18616-18628, 18642-18675, 18695-18741, 18759-18775, 18789-18825, 18844-18882, 18900-18964, 18982-19003, 19020-19117, 19142-19346, 19371-19424, 19441-19448, 19464-19468, 19472-19474, 19490-19497, 19505-19506, 19510-19523, 19542-19560, 19577-19612, 19622-19679, 19684-19693, 19707-19713, 19729-19750, 19754-19763, 19772-19808, 19812-19863, 19872-19885, 19891-19892, 19896, 19900-19901, 19919-19923, 19927-19937, 19941-19948, 19958-19974, 19988-20021, 20031-20065, 20074-20096, 20105-20129, 20138-20152, 20216, 20246-20269, 20292-20423, 20438-20440
src/marketplace_api.py                    69     31    55%   68-69, 95-113, 118, 123-132, 147-163
src/member_certificates_api.py           119     75    37%   65, 79, 83-94, 106-130, 138-154, 158-195, 206-212, 220-228, 241-249, 258-270, 278, 287-290
src/moderation.py                         45     33    27%   60-61, 65-79, 83-103
src/notification_integrations_api.py     531    350    34%   87-92, 97-100, 114-117, 130-133, 222-225, 229-230, 234-235, 239-241, 245, 249-250, 254-255, 259-264, 268-272, 276-284, 288-292, 296-298, 302-304, 308-310, 314-316, 320-322, 326-328, 332, 336, 340-343, 347-350, 354-357, 366-367, 377-380, 384-392, 396-414, 418-431, 443-481, 492-496, 509-638, 651-660, 678-712, 725-747, 760-762, 782-799, 812-818, 832-838, 860-872, 876-895, 899-918, 922, 936-949, 973-1025
src/oidc_sso_api.py                      108     85    21%   50, 54-59, 68-81, 85-106, 116-137, 147-211
src/org_analytics_api.py                  87     65    25%   35, 41, 56-137, 158-198, 217-262, 276-320, 343-361
src/org_modules_api.py                    49     24    51%   41-45, 70-71, 84-89, 101-117
src/org_staff_api.py                     128     80    38%   88-92, 96, 110-138, 154-161, 174-205, 218-235, 247-256, 264-294
src/organization_access_api.py           244    157    36%   67-76, 80-85, 89, 100-103, 108, 119-124, 129, 134-139, 164, 176-187, 191-204, 208-209, 221-228, 237-287, 291-297, 301-347, 356-366, 375, 384-390, 405-442, 457-471, 484-495
src/payments.py                          196    136    31%   90-92, 96, 99-100, 107-109, 112-177, 181-224, 244-246, 250, 253-255, 258-297, 300-313, 333-334, 338, 341-369, 372-406, 422-444
src/plan_policy.py                        37     20    46%   42, 46-53, 57-66, 70
src/platform_health_api.py                19      9    53%   25, 30-45
src/product_observability.py              16      8    50%   22-35
src/product_telemetry.py                  12      8    33%   19-26
src/product_telemetry_api.py              27      8    70%   33-48, 53-61
src/qa_seed_api.py                        39     28    28%   35-82
src/quiz_api.py                          316    238    25%   114-135, 151, 166-172, 176-186, 191-332, 351-403, 416-423, 435-439, 451-453, 465-480, 502-525, 540-577, 588-632, 645-714, 729-740
src/quiz_models.py                        65      0   100%
src/report_scheduler_api.py              100     55    45%   41-48, 52-57, 85, 111-119, 134-153, 161, 176-197, 210-216
src/report_scheduler_models.py            23      0   100%
src/signing.py                            42     42     0%   7-121
src/social_api.py                        223    163    27%   112-126, 135-146, 151, 155-160, 164-179, 184-187, 196-256, 266-285, 296-307, 318-327, 348, 360-367, 376-388, 397-409, 418-428, 437-448, 460-489, 500-514, 522-551, 560-568, 592-602
src/tickets_api.py                       128    100    22%   47-56, 70-95, 100-111, 123-140, 152-165, 185-193, 208-285, 300-330
src/training_api.py                      566    349    38%   40-65, 248-251, 255-258, 262-270, 274-277, 281-286, 290-293, 297, 310, 329, 343-348, 352-362, 366-386, 390-393, 428-431, 441-446, 467-499, 513-518, 533-546, 561-571, 585-590, 605-624, 638-659, 672-680, 695-712, 725-783, 801-817, 831-843, 858-863, 876-880, 893-915, 936-986, 1004-1022, 1029-1091, 1103-1104, 1119-1129
src/venue_reservations_api.py            126     63    50%   46-50, 70-80, 84-93, 102-112, 125-134, 149-169, 184-201, 214-227, 231, 235-237, 249-282
src/venues_api.py                        101     45    55%   42-45, 50-53, 71, 75-85, 94-101, 110-116, 126-141, 156-170, 178-189
src/watermark.py                          83     83     0%   25-182
src/webhooks.py                           96     67    30%   39, 44-45, 50-70, 81-97, 112-186
--------------------------------------------------------------------
TOTAL                                  21678  14438    33%
Coverage HTML written to dir htmlcov
Coverage XML written to file coverage.xml

=========================== short test summary info ============================
ERROR tests/test_api.py::TestHealthEndpoint::test_health_returns_ok - sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) index ix_learning_paths_org_id already exists
[SQL: CREATE INDEX ix_learning_paths_org_id ON learning_paths (org_id)]
(Background on this error at: https://sqlalche.me/e/20/e3q8)
!!!!!!!!!!!!!!!!!!!!!!!!!! stopping after 1 failures !!!!!!!!!!!!!!!!!!!!!!!!!!!
======================== 6 warnings, 1 error in 26.90s =========================
Error: Process completed with exit code 1. 
dependency failed to start: container heptacert-backend-1 is unhealthy
root@heptapusgroup-dev-server:/srv/heptapus-certs/heptacert# docker compose logs backend
backend-1  | INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
backend-1  | INFO  [alembic.runtime.migration] Will assume transactional DDL.
backend-1  | INFO  [alembic.runtime.migration] Running upgrade 081_lms_tables -> 082_lms_staff_cert_pdf, Add OrgLmsStaff table and cert_pdf_url to LMS enrollment tables.
backend-1  | Traceback (most recent call last):
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1967, in _exec_single_context
backend-1  |     self.dialect.do_execute(
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/default.py", line 941, in do_execute
backend-1  |     cursor.execute(statement, parameters)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/psycopg/cursor.py", line 97, in execute
backend-1  |     raise ex.with_traceback(None)
backend-1  | psycopg.errors.UndefinedTable: relation "lms_journey_enrollments" does not exist
backend-1  |
backend-1  | The above exception was the direct cause of the following exception:
backend-1  |
backend-1  | Traceback (most recent call last):
backend-1  |   File "/usr/local/bin/alembic", line 6, in <module>
backend-1  |     sys.exit(main())
backend-1  |              ^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/config.py", line 636, in main
backend-1  |     CommandLine(prog=prog).main(argv=argv)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/config.py", line 626, in main
backend-1  |     self.run_cmd(cfg, options)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/config.py", line 603, in run_cmd
backend-1  |     fn(
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/command.py", line 406, in upgrade
backend-1  |     script.run_env()
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/script/base.py", line 586, in run_env
backend-1  |     util.load_python_file(self.dir, "env.py")
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/util/pyfiles.py", line 95, in load_python_file
backend-1  |     module = load_module_py(module_id, path)
backend-1  |              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/util/pyfiles.py", line 113, in load_module_py
backend-1  |     spec.loader.exec_module(module)  # type: ignore
backend-1  |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "<frozen importlib._bootstrap_external>", line 999, in exec_module
backend-1  |   File "<frozen importlib._bootstrap>", line 488, in _call_with_frames_removed
backend-1  |   File "/app/alembic/env.py", line 88, in <module>
backend-1  |     run_migrations_online()
backend-1  |   File "/app/alembic/env.py", line 82, in run_migrations_online
backend-1  |     context.run_migrations()
backend-1  |   File "<string>", line 8, in run_migrations
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/runtime/environment.py", line 946, in run_migrations
backend-1  |     self.get_context().run_migrations(**kw)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/runtime/migration.py", line 628, in run_migrations
backend-1  |     step.migration_fn(**kw)
backend-1  |   File "/app/alembic/versions/082_lms_staff_cert_pdf.py", line 29, in upgrade
backend-1  |     with op.batch_alter_table("lms_journey_enrollments") as batch_op:
backend-1  |          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/contextlib.py", line 144, in __exit__
backend-1  |     next(self.gen)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/operations/base.py", line 398, in batch_alter_table
backend-1  |     impl.flush()
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/operations/batch.py", line 116, in flush
backend-1  |     fn(*arg, **kw)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/ddl/impl.py", line 337, in add_column
backend-1  |     self._exec(base.AddColumn(table_name, column, schema=schema))
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/ddl/impl.py", line 210, in _exec
backend-1  |     return conn.execute(construct, params)
backend-1  |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1418, in execute
backend-1  |     return meth(
backend-1  |            ^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/sql/ddl.py", line 180, in _execute_on_connection
backend-1  |     return connection._execute_ddl(
backend-1  |            ^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1529, in _execute_ddl
backend-1  |     ret = self._execute_context(
backend-1  |           ^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1846, in _execute_context
backend-1  |     return self._exec_single_context(
backend-1  |            ^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1986, in _exec_single_context
backend-1  |     self._handle_dbapi_exception(
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 2355, in _handle_dbapi_exception
backend-1  |     raise sqlalchemy_exception.with_traceback(exc_info[2]) from e
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1967, in _exec_single_context
backend-1  |     self.dialect.do_execute(
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/default.py", line 941, in do_execute
backend-1  |     cursor.execute(statement, parameters)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/psycopg/cursor.py", line 97, in execute
backend-1  |     raise ex.with_traceback(None)
backend-1  | sqlalchemy.exc.ProgrammingError: (psycopg.errors.UndefinedTable) relation "lms_journey_enrollments" does not exist
backend-1  | [SQL: ALTER TABLE lms_journey_enrollments ADD COLUMN cert_pdf_url TEXT]
backend-1  | (Background on this error at: https://sqlalche.me/e/20/f405)
backend-1  | INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
backend-1  | INFO  [alembic.runtime.migration] Will assume transactional DDL.
backend-1  | INFO  [alembic.runtime.migration] Running upgrade 081_lms_tables -> 082_lms_staff_cert_pdf, Add OrgLmsStaff table and cert_pdf_url to LMS enrollment tables.
backend-1  | Traceback (most recent call last):
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1967, in _exec_single_context
backend-1  |     self.dialect.do_execute(
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/default.py", line 941, in do_execute
backend-1  |     cursor.execute(statement, parameters)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/psycopg/cursor.py", line 97, in execute
backend-1  |     raise ex.with_traceback(None)
backend-1  | psycopg.errors.UndefinedTable: relation "lms_journey_enrollments" does not exist
backend-1  |
backend-1  | The above exception was the direct cause of the following exception:
backend-1  |
backend-1  | Traceback (most recent call last):
backend-1  |   File "/usr/local/bin/alembic", line 6, in <module>
backend-1  |     sys.exit(main())
backend-1  |              ^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/config.py", line 636, in main
backend-1  |     CommandLine(prog=prog).main(argv=argv)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/config.py", line 626, in main
backend-1  |     self.run_cmd(cfg, options)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/config.py", line 603, in run_cmd
backend-1  |     fn(
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/command.py", line 406, in upgrade
backend-1  |     script.run_env()
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/script/base.py", line 586, in run_env
backend-1  |     util.load_python_file(self.dir, "env.py")
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/util/pyfiles.py", line 95, in load_python_file
backend-1  |     module = load_module_py(module_id, path)
backend-1  |              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/util/pyfiles.py", line 113, in load_module_py
backend-1  |     spec.loader.exec_module(module)  # type: ignore
backend-1  |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "<frozen importlib._bootstrap_external>", line 999, in exec_module
backend-1  |   File "<frozen importlib._bootstrap>", line 488, in _call_with_frames_removed
backend-1  |   File "/app/alembic/env.py", line 88, in <module>
backend-1  |     run_migrations_online()
backend-1  |   File "/app/alembic/env.py", line 82, in run_migrations_online
backend-1  |     context.run_migrations()
backend-1  |   File "<string>", line 8, in run_migrations
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/runtime/environment.py", line 946, in run_migrations
backend-1  |     self.get_context().run_migrations(**kw)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/runtime/migration.py", line 628, in run_migrations
backend-1  |     step.migration_fn(**kw)
backend-1  |   File "/app/alembic/versions/082_lms_staff_cert_pdf.py", line 29, in upgrade
backend-1  |     with op.batch_alter_table("lms_journey_enrollments") as batch_op:
backend-1  |          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/contextlib.py", line 144, in __exit__
backend-1  |     next(self.gen)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/operations/base.py", line 398, in batch_alter_table
backend-1  |     impl.flush()
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/operations/batch.py", line 116, in flush
backend-1  |     fn(*arg, **kw)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/ddl/impl.py", line 337, in add_column
backend-1  |     self._exec(base.AddColumn(table_name, column, schema=schema))
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/ddl/impl.py", line 210, in _exec
backend-1  |     return conn.execute(construct, params)
backend-1  |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1418, in execute
backend-1  |     return meth(
backend-1  |            ^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/sql/ddl.py", line 180, in _execute_on_connection
backend-1  |     return connection._execute_ddl(
backend-1  |            ^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1529, in _execute_ddl
backend-1  |     ret = self._execute_context(
backend-1  |           ^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1846, in _execute_context
backend-1  |     return self._exec_single_context(
backend-1  |            ^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1986, in _exec_single_context
backend-1  |     self._handle_dbapi_exception(
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 2355, in _handle_dbapi_exception
backend-1  |     raise sqlalchemy_exception.with_traceback(exc_info[2]) from e
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1967, in _exec_single_context
backend-1  |     self.dialect.do_execute(
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/default.py", line 941, in do_execute
backend-1  |     cursor.execute(statement, parameters)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/psycopg/cursor.py", line 97, in execute
backend-1  |     raise ex.with_traceback(None)
backend-1  | sqlalchemy.exc.ProgrammingError: (psycopg.errors.UndefinedTable) relation "lms_journey_enrollments" does not exist
backend-1  | [SQL: ALTER TABLE lms_journey_enrollments ADD COLUMN cert_pdf_url TEXT]
backend-1  | (Background on this error at: https://sqlalche.me/e/20/f405)
backend-1  | INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
backend-1  | INFO  [alembic.runtime.migration] Will assume transactional DDL.
backend-1  | INFO  [alembic.runtime.migration] Running upgrade 081_lms_tables -> 082_lms_staff_cert_pdf, Add OrgLmsStaff table and cert_pdf_url to LMS enrollment tables.
backend-1  | Traceback (most recent call last):
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1967, in _exec_single_context
backend-1  |     self.dialect.do_execute(
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/default.py", line 941, in do_execute
backend-1  |     cursor.execute(statement, parameters)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/psycopg/cursor.py", line 97, in execute
backend-1  |     raise ex.with_traceback(None)
backend-1  | psycopg.errors.UndefinedTable: relation "lms_journey_enrollments" does not exist
backend-1  |
backend-1  | The above exception was the direct cause of the following exception:
backend-1  |
backend-1  | Traceback (most recent call last):
backend-1  |   File "/usr/local/bin/alembic", line 6, in <module>
backend-1  |     sys.exit(main())
backend-1  |              ^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/config.py", line 636, in main
backend-1  |     CommandLine(prog=prog).main(argv=argv)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/config.py", line 626, in main
backend-1  |     self.run_cmd(cfg, options)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/config.py", line 603, in run_cmd
backend-1  |     fn(
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/command.py", line 406, in upgrade
backend-1  |     script.run_env()
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/script/base.py", line 586, in run_env
backend-1  |     util.load_python_file(self.dir, "env.py")
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/util/pyfiles.py", line 95, in load_python_file
backend-1  |     module = load_module_py(module_id, path)
backend-1  |              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/util/pyfiles.py", line 113, in load_module_py
backend-1  |     spec.loader.exec_module(module)  # type: ignore
backend-1  |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "<frozen importlib._bootstrap_external>", line 999, in exec_module
backend-1  |   File "<frozen importlib._bootstrap>", line 488, in _call_with_frames_removed
backend-1  |   File "/app/alembic/env.py", line 88, in <module>
backend-1  |     run_migrations_online()
backend-1  |   File "/app/alembic/env.py", line 82, in run_migrations_online
backend-1  |     context.run_migrations()
backend-1  |   File "<string>", line 8, in run_migrations
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/runtime/environment.py", line 946, in run_migrations
backend-1  |     self.get_context().run_migrations(**kw)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/runtime/migration.py", line 628, in run_migrations
backend-1  |     step.migration_fn(**kw)
backend-1  |   File "/app/alembic/versions/082_lms_staff_cert_pdf.py", line 29, in upgrade
backend-1  |     with op.batch_alter_table("lms_journey_enrollments") as batch_op:
backend-1  |          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/contextlib.py", line 144, in __exit__
backend-1  |     next(self.gen)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/operations/base.py", line 398, in batch_alter_table
backend-1  |     impl.flush()
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/operations/batch.py", line 116, in flush
backend-1  |     fn(*arg, **kw)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/ddl/impl.py", line 337, in add_column
backend-1  |     self._exec(base.AddColumn(table_name, column, schema=schema))
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/ddl/impl.py", line 210, in _exec
backend-1  |     return conn.execute(construct, params)
backend-1  |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1418, in execute
backend-1  |     return meth(
backend-1  |            ^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/sql/ddl.py", line 180, in _execute_on_connection
backend-1  |     return connection._execute_ddl(
backend-1  |            ^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1529, in _execute_ddl
backend-1  |     ret = self._execute_context(
backend-1  |           ^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1846, in _execute_context
backend-1  |     return self._exec_single_context(
backend-1  |            ^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1986, in _exec_single_context
backend-1  |     self._handle_dbapi_exception(
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 2355, in _handle_dbapi_exception
backend-1  |     raise sqlalchemy_exception.with_traceback(exc_info[2]) from e
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1967, in _exec_single_context
backend-1  |     self.dialect.do_execute(
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/default.py", line 941, in do_execute
backend-1  |     cursor.execute(statement, parameters)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/psycopg/cursor.py", line 97, in execute
backend-1  |     raise ex.with_traceback(None)
backend-1  | sqlalchemy.exc.ProgrammingError: (psycopg.errors.UndefinedTable) relation "lms_journey_enrollments" does not exist
backend-1  | [SQL: ALTER TABLE lms_journey_enrollments ADD COLUMN cert_pdf_url TEXT]
backend-1  | (Background on this error at: https://sqlalche.me/e/20/f405)
backend-1  | INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
backend-1  | INFO  [alembic.runtime.migration] Will assume transactional DDL.
backend-1  | INFO  [alembic.runtime.migration] Running upgrade 081_lms_tables -> 082_lms_staff_cert_pdf, Add OrgLmsStaff table and cert_pdf_url to LMS enrollment tables.
backend-1  | Traceback (most recent call last):
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1967, in _exec_single_context
backend-1  |     self.dialect.do_execute(
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/default.py", line 941, in do_execute
backend-1  |     cursor.execute(statement, parameters)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/psycopg/cursor.py", line 97, in execute
backend-1  |     raise ex.with_traceback(None)
backend-1  | psycopg.errors.UndefinedTable: relation "lms_journey_enrollments" does not exist
backend-1  |
backend-1  | The above exception was the direct cause of the following exception:
backend-1  |
backend-1  | Traceback (most recent call last):
backend-1  |   File "/usr/local/bin/alembic", line 6, in <module>
backend-1  |     sys.exit(main())
backend-1  |              ^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/config.py", line 636, in main
backend-1  |     CommandLine(prog=prog).main(argv=argv)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/config.py", line 626, in main
backend-1  |     self.run_cmd(cfg, options)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/config.py", line 603, in run_cmd
backend-1  |     fn(
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/command.py", line 406, in upgrade
backend-1  |     script.run_env()
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/script/base.py", line 586, in run_env
backend-1  |     util.load_python_file(self.dir, "env.py")
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/util/pyfiles.py", line 95, in load_python_file
backend-1  |     module = load_module_py(module_id, path)
backend-1  |              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/util/pyfiles.py", line 113, in load_module_py
backend-1  |     spec.loader.exec_module(module)  # type: ignore
backend-1  |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "<frozen importlib._bootstrap_external>", line 999, in exec_module
backend-1  |   File "<frozen importlib._bootstrap>", line 488, in _call_with_frames_removed
backend-1  |   File "/app/alembic/env.py", line 88, in <module>
backend-1  |     run_migrations_online()
backend-1  |   File "/app/alembic/env.py", line 82, in run_migrations_online
backend-1  |     context.run_migrations()
backend-1  |   File "<string>", line 8, in run_migrations
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/runtime/environment.py", line 946, in run_migrations
backend-1  |     self.get_context().run_migrations(**kw)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/runtime/migration.py", line 628, in run_migrations
backend-1  |     step.migration_fn(**kw)
backend-1  |   File "/app/alembic/versions/082_lms_staff_cert_pdf.py", line 29, in upgrade
backend-1  |     with op.batch_alter_table("lms_journey_enrollments") as batch_op:
backend-1  |          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/contextlib.py", line 144, in __exit__
backend-1  |     next(self.gen)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/operations/base.py", line 398, in batch_alter_table
backend-1  |     impl.flush()
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/operations/batch.py", line 116, in flush
backend-1  |     fn(*arg, **kw)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/ddl/impl.py", line 337, in add_column
backend-1  |     self._exec(base.AddColumn(table_name, column, schema=schema))
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/ddl/impl.py", line 210, in _exec
backend-1  |     return conn.execute(construct, params)
backend-1  |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1418, in execute
backend-1  |     return meth(
backend-1  |            ^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/sql/ddl.py", line 180, in _execute_on_connection
backend-1  |     return connection._execute_ddl(
backend-1  |            ^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1529, in _execute_ddl
backend-1  |     ret = self._execute_context(
backend-1  |           ^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1846, in _execute_context
backend-1  |     return self._exec_single_context(
backend-1  |            ^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1986, in _exec_single_context
backend-1  |     self._handle_dbapi_exception(
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 2355, in _handle_dbapi_exception
backend-1  |     raise sqlalchemy_exception.with_traceback(exc_info[2]) from e
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1967, in _exec_single_context
backend-1  |     self.dialect.do_execute(
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/default.py", line 941, in do_execute
backend-1  |     cursor.execute(statement, parameters)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/psycopg/cursor.py", line 97, in execute
backend-1  |     raise ex.with_traceback(None)
backend-1  | sqlalchemy.exc.ProgrammingError: (psycopg.errors.UndefinedTable) relation "lms_journey_enrollments" does not exist
backend-1  | [SQL: ALTER TABLE lms_journey_enrollments ADD COLUMN cert_pdf_url TEXT]
backend-1  | (Background on this error at: https://sqlalche.me/e/20/f405)
backend-1  | INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
backend-1  | INFO  [alembic.runtime.migration] Will assume transactional DDL.
backend-1  | INFO  [alembic.runtime.migration] Running upgrade 081_lms_tables -> 082_lms_staff_cert_pdf, Add OrgLmsStaff table and cert_pdf_url to LMS enrollment tables.
backend-1  | Traceback (most recent call last):
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1967, in _exec_single_context
backend-1  |     self.dialect.do_execute(
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/default.py", line 941, in do_execute
backend-1  |     cursor.execute(statement, parameters)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/psycopg/cursor.py", line 97, in execute
backend-1  |     raise ex.with_traceback(None)
backend-1  | psycopg.errors.UndefinedTable: relation "lms_journey_enrollments" does not exist
backend-1  |
backend-1  | The above exception was the direct cause of the following exception:
backend-1  |
backend-1  | Traceback (most recent call last):
backend-1  |   File "/usr/local/bin/alembic", line 6, in <module>
backend-1  |     sys.exit(main())
backend-1  |              ^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/config.py", line 636, in main
backend-1  |     CommandLine(prog=prog).main(argv=argv)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/config.py", line 626, in main
backend-1  |     self.run_cmd(cfg, options)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/config.py", line 603, in run_cmd
backend-1  |     fn(
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/command.py", line 406, in upgrade
backend-1  |     script.run_env()
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/script/base.py", line 586, in run_env
backend-1  |     util.load_python_file(self.dir, "env.py")
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/util/pyfiles.py", line 95, in load_python_file
backend-1  |     module = load_module_py(module_id, path)
backend-1  |              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/util/pyfiles.py", line 113, in load_module_py
backend-1  |     spec.loader.exec_module(module)  # type: ignore
backend-1  |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "<frozen importlib._bootstrap_external>", line 999, in exec_module
backend-1  |   File "<frozen importlib._bootstrap>", line 488, in _call_with_frames_removed
backend-1  |   File "/app/alembic/env.py", line 88, in <module>
backend-1  |     run_migrations_online()
backend-1  |   File "/app/alembic/env.py", line 82, in run_migrations_online
backend-1  |     context.run_migrations()
backend-1  |   File "<string>", line 8, in run_migrations
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/runtime/environment.py", line 946, in run_migrations
backend-1  |     self.get_context().run_migrations(**kw)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/runtime/migration.py", line 628, in run_migrations
backend-1  |     step.migration_fn(**kw)
backend-1  |   File "/app/alembic/versions/082_lms_staff_cert_pdf.py", line 29, in upgrade
backend-1  |     with op.batch_alter_table("lms_journey_enrollments") as batch_op:
backend-1  |          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/contextlib.py", line 144, in __exit__
backend-1  |     next(self.gen)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/operations/base.py", line 398, in batch_alter_table
backend-1  |     impl.flush()
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/operations/batch.py", line 116, in flush
backend-1  |     fn(*arg, **kw)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/ddl/impl.py", line 337, in add_column
backend-1  |     self._exec(base.AddColumn(table_name, column, schema=schema))
backend-1  |   File "/usr/local/lib/python3.12/site-packages/alembic/ddl/impl.py", line 210, in _exec
backend-1  |     return conn.execute(construct, params)
backend-1  |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1418, in execute
backend-1  |     return meth(
backend-1  |            ^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/sql/ddl.py", line 180, in _execute_on_connection
backend-1  |     return connection._execute_ddl(
backend-1  |            ^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1529, in _execute_ddl
backend-1  |     ret = self._execute_context(
backend-1  |           ^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1846, in _execute_context
backend-1  |     return self._exec_single_context(
backend-1  |            ^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1986, in _exec_single_context
backend-1  |     self._handle_dbapi_exception(
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 2355, in _handle_dbapi_exception
backend-1  |     raise sqlalchemy_exception.with_traceback(exc_info[2]) from e
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/base.py", line 1967, in _exec_single_context
backend-1  |     self.dialect.do_execute(
backend-1  |   File "/usr/local/lib/python3.12/site-packages/sqlalchemy/engine/default.py", line 941, in do_execute
backend-1  |     cursor.execute(statement, parameters)
backend-1  |   File "/usr/local/lib/python3.12/site-packages/psycopg/cursor.py", line 97, in execute
backend-1  |     raise ex.with_traceback(None)
backend-1  | sqlalchemy.exc.ProgrammingError: (psycopg.errors.UndefinedTable) relation "lms_journey_enrollments" does not exist
backend-1  | [SQL: ALTER TABLE lms_journey_enrollments ADD COLUMN cert_pdf_url TEXT]
backend-1  | (Background on this error at: https://sqlalche.me/e/20/f405)
root@heptapusgroup-dev-server:/srv/heptapus-certs/heptacert#


//çözüldüğü iddia ediliyor


//yeni sorun:
Run python -m pytest tests/ -v --tb=short -m "unit or not integration" -x
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.0.3, pluggy-1.6.0 -- /opt/hostedtoolcache/Python/3.12.13/x64/bin/python
cachedir: .pytest_cache
rootdir: /home/runner/work/heptapus-certs/heptapus-certs/heptacert/backend
configfile: pytest.ini
plugins: asyncio-1.3.0, cov-6.0.0, anyio-4.13.0
asyncio: mode=Mode.AUTO, debug=False, asyncio_default_fixture_loop_scope=session, asyncio_default_test_loop_scope=function
collecting ... collected 402 items

tests/test_api.py::TestHealthEndpoint::test_health_returns_ok ERROR      [  0%]

==================================== ERRORS ====================================
_________ ERROR at setup of TestHealthEndpoint.test_health_returns_ok __________
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/visitors.py:137: in _compiler_dispatch
    meth = getter(visitor)
           ^^^^^^^^^^^^^^^
E   AttributeError: 'SQLiteTypeCompiler' object has no attribute 'visit_JSONB'. Did you mean: 'visit_JSON'?

The above exception was the direct cause of the following exception:
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/compiler.py:6647: in visit_create_table
    processed = self.process(
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/compiler.py:915: in process
    return obj._compiler_dispatch(self, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/visitors.py:141: in _compiler_dispatch
    return meth(self, **kw)  # type: ignore  # noqa: E501
           ^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/compiler.py:6678: in visit_create_column
    text = self.get_column_specification(column, first_pk=first_pk)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/dialects/sqlite/base.py:1540: in get_column_specification
    coltype = self.dialect.type_compiler_instance.process(
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/compiler.py:960: in process
    return type_._compiler_dispatch(self, **kw)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/visitors.py:139: in _compiler_dispatch
    return visitor.visit_unsupported_compilation(self, err, **kw)  # type: ignore  # noqa: E501
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/compiler.py:965: in visit_unsupported_compilation
    raise exc.UnsupportedCompilationError(self, element) from err
E   sqlalchemy.exc.UnsupportedCompilationError: Compiler <sqlalchemy.dialects.sqlite.base.SQLiteTypeCompiler object at 0x7fc235ca7200> can't render element of type JSONB (Background on this error at: https://sqlalche.me/e/20/l7de)

The above exception was the direct cause of the following exception:
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/pytest_asyncio/plugin.py:458: in setup
    return super().setup()
           ^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/pytest_asyncio/plugin.py:743: in pytest_fixture_setup
    hook_result = yield
                  ^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/pytest_asyncio/plugin.py:313: in _asyncgen_fixture_wrapper
    result = runner.run(setup(), context=context)
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/asyncio/runners.py:118: in run
    return self._loop.run_until_complete(task)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/asyncio/base_events.py:691: in run_until_complete
    return future.result()
           ^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/pytest_asyncio/plugin.py:309: in setup
    res = await gen_obj.__anext__()
          ^^^^^^^^^^^^^^^^^^^^^^^^^
tests/conftest.py:31: in setup_database
    await conn.run_sync(Base.metadata.create_all)
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/ext/asyncio/engine.py:886: in run_sync
    return await greenlet_spawn(
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/util/_concurrency_py3k.py:203: in greenlet_spawn
    result = context.switch(value)
             ^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/schema.py:5868: in create_all
    bind._run_ddl_visitor(
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/engine/base.py:2459: in _run_ddl_visitor
    visitorcallable(self.dialect, self, **kwargs).traverse_single(element)
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/visitors.py:664: in traverse_single
    return meth(obj, **kw)
           ^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/ddl.py:918: in visit_metadata
    self.traverse_single(
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/visitors.py:664: in traverse_single
    return meth(obj, **kw)
           ^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/ddl.py:956: in visit_table
    )._invoke_with(self.connection)
      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/ddl.py:314: in _invoke_with
    return bind.execute(self)
           ^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/engine/base.py:1418: in execute
    return meth(
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/ddl.py:180: in _execute_on_connection
    return connection._execute_ddl(
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/engine/base.py:1526: in _execute_ddl
    compiled = ddl.compile(
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/elements.py:308: in compile
    return self._compiler(dialect, **kw)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/ddl.py:69: in _compiler
    return dialect.ddl_compiler(dialect, self, **kw)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/compiler.py:870: in __init__
    self.string = self.process(self.statement, **compile_kwargs)
                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/compiler.py:915: in process
    return obj._compiler_dispatch(self, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/visitors.py:141: in _compiler_dispatch
    return meth(self, **kw)  # type: ignore  # noqa: E501
           ^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/compiler.py:6657: in visit_create_table
    raise exc.CompileError(
E   sqlalchemy.exc.CompileError: (in table 'crm_accounts', column 'tags'): Compiler <sqlalchemy.dialects.sqlite.base.SQLiteTypeCompiler object at 0x7fc235ca7200> can't render element of type JSONB
=============================== warnings summary ===============================
../../../../../../../opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/passlib/utils/__init__.py:854
  /opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/passlib/utils/__init__.py:854: DeprecationWarning: 'crypt' is deprecated and slated for removal in Python 3.13
    from crypt import crypt as _crypt

src/main.py:5707
  /home/runner/work/heptapus-certs/heptapus-certs/heptacert/backend/src/main.py:5707: DeprecationWarning: 
          on_event is deprecated, use lifespan event handlers instead.
  
          Read more about it in the
          [FastAPI docs for Lifespan Events](https://fastapi.tiangolo.com/advanced/events/).
          
    @app.on_event("startup")

../../../../../../../opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/fastapi/applications.py:4598
  /opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/fastapi/applications.py:4598: DeprecationWarning: 
          on_event is deprecated, use lifespan event handlers instead.
  
          Read more about it in the
          [FastAPI docs for Lifespan Events](https://fastapi.tiangolo.com/advanced/events/).
          
    return self.router.on_event(event_type)  # ty: ignore[deprecated]

../../../../../../../opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/pydantic/_internal/_config.py:291
../../../../../../../opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/pydantic/_internal/_config.py:291
../../../../../../../opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/pydantic/_internal/_config.py:291
  /opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/pydantic/_internal/_config.py:291: PydanticDeprecatedSince20: Support for class-based `config` is deprecated, use ConfigDict instead. Deprecated in Pydantic V2.0 to be removed in V3.0. See Pydantic V2 Migration Guide at https://errors.pydantic.dev/2.9/migration/
    warnings.warn(DEPRECATION_MESSAGE, DeprecationWarning)

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
=========================== short test summary info ============================
ERROR tests/test_api.py::TestHealthEndpoint::test_health_returns_ok - sqlalchemy.exc.CompileError: (in table 'crm_accounts', column 'tags'): Compiler <sqlalchemy.dialects.sqlite.base.SQLiteTypeCompiler object at 0x7fc235ca7200> can't render element of type JSONB
!!!!!!!!!!!!!!!!!!!!!!!!!! stopping after 1 failures !!!!!!!!!!!!!!!!!!!!!!!!!!!
========================= 6 warnings, 1 error in 6.64s =========================
Error: Process completed with exit code 1.

============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.0.3, pluggy-1.6.0 -- /opt/hostedtoolcache/Python/3.12.13/x64/bin/python
cachedir: .pytest_cache
rootdir: /home/runner/work/heptapus-certs/heptapus-certs/heptacert/backend
configfile: pytest.ini
plugins: asyncio-1.3.0, cov-6.0.0, anyio-4.13.0
asyncio: mode=Mode.AUTO, debug=False, asyncio_default_fixture_loop_scope=session, asyncio_default_test_loop_scope=function
collecting ... collected 402 items

tests/test_api.py::TestHealthEndpoint::test_health_returns_ok ERROR      [  0%]

==================================== ERRORS ====================================
_________ ERROR at setup of TestHealthEndpoint.test_health_returns_ok __________
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/visitors.py:137: in _compiler_dispatch
    meth = getter(visitor)
           ^^^^^^^^^^^^^^^
E   AttributeError: 'SQLiteTypeCompiler' object has no attribute 'visit_JSONB'. Did you mean: 'visit_JSON'?

The above exception was the direct cause of the following exception:
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/compiler.py:6647: in visit_create_table
    processed = self.process(
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/compiler.py:915: in process
    return obj._compiler_dispatch(self, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/visitors.py:141: in _compiler_dispatch
    return meth(self, **kw)  # type: ignore  # noqa: E501
           ^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/compiler.py:6678: in visit_create_column
    text = self.get_column_specification(column, first_pk=first_pk)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/dialects/sqlite/base.py:1540: in get_column_specification
    coltype = self.dialect.type_compiler_instance.process(
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/compiler.py:960: in process
    return type_._compiler_dispatch(self, **kw)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/visitors.py:139: in _compiler_dispatch
    return visitor.visit_unsupported_compilation(self, err, **kw)  # type: ignore  # noqa: E501
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/compiler.py:965: in visit_unsupported_compilation
    raise exc.UnsupportedCompilationError(self, element) from err
E   sqlalchemy.exc.UnsupportedCompilationError: Compiler <sqlalchemy.dialects.sqlite.base.SQLiteTypeCompiler object at 0x7fc69d671a90> can't render element of type JSONB (Background on this error at: https://sqlalche.me/e/20/l7de)

The above exception was the direct cause of the following exception:
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/pytest_asyncio/plugin.py:458: in setup
    return super().setup()
           ^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/pytest_asyncio/plugin.py:743: in pytest_fixture_setup
    hook_result = yield
                  ^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/pytest_asyncio/plugin.py:313: in _asyncgen_fixture_wrapper
    result = runner.run(setup(), context=context)
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/asyncio/runners.py:118: in run
    return self._loop.run_until_complete(task)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/asyncio/base_events.py:691: in run_until_complete
    return future.result()
           ^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/pytest_asyncio/plugin.py:309: in setup
    res = await gen_obj.__anext__()
          ^^^^^^^^^^^^^^^^^^^^^^^^^
tests/conftest.py:31: in setup_database
    await conn.run_sync(Base.metadata.create_all)
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/ext/asyncio/engine.py:886: in run_sync
    return await greenlet_spawn(
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/util/_concurrency_py3k.py:203: in greenlet_spawn
    result = context.switch(value)
             ^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/schema.py:5868: in create_all
    bind._run_ddl_visitor(
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/engine/base.py:2459: in _run_ddl_visitor
    visitorcallable(self.dialect, self, **kwargs).traverse_single(element)
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/visitors.py:664: in traverse_single
    return meth(obj, **kw)
           ^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/ddl.py:918: in visit_metadata
    self.traverse_single(
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/visitors.py:664: in traverse_single
    return meth(obj, **kw)
           ^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/ddl.py:956: in visit_table
    )._invoke_with(self.connection)
      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/ddl.py:314: in _invoke_with
    return bind.execute(self)
           ^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/engine/base.py:1418: in execute
    return meth(
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/ddl.py:180: in _execute_on_connection
    return connection._execute_ddl(
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/engine/base.py:1526: in _execute_ddl
    compiled = ddl.compile(
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/elements.py:308: in compile
    return self._compiler(dialect, **kw)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/ddl.py:69: in _compiler
    return dialect.ddl_compiler(dialect, self, **kw)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/compiler.py:870: in __init__
    self.string = self.process(self.statement, **compile_kwargs)
                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/compiler.py:915: in process
    return obj._compiler_dispatch(self, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/visitors.py:141: in _compiler_dispatch
    return meth(self, **kw)  # type: ignore  # noqa: E501
           ^^^^^^^^^^^^^^^^
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/sqlalchemy/sql/compiler.py:6657: in visit_create_table
    raise exc.CompileError(
E   sqlalchemy.exc.CompileError: (in table 'crm_accounts', column 'tags'): Compiler <sqlalchemy.dialects.sqlite.base.SQLiteTypeCompiler object at 0x7fc69d671a90> can't render element of type JSONB
=============================== warnings summary ===============================
../../../../../../../opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/passlib/utils/__init__.py:854
  /opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/passlib/utils/__init__.py:854: DeprecationWarning: 'crypt' is deprecated and slated for removal in Python 3.13
    from crypt import crypt as _crypt

src/main.py:5707
  /home/runner/work/heptapus-certs/heptapus-certs/heptacert/backend/src/main.py:5707: DeprecationWarning: 
          on_event is deprecated, use lifespan event handlers instead.
  
          Read more about it in the
          [FastAPI docs for Lifespan Events](https://fastapi.tiangolo.com/advanced/events/).
          
    @app.on_event("startup")

../../../../../../../opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/fastapi/applications.py:4598
  /opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/fastapi/applications.py:4598: DeprecationWarning: 
          on_event is deprecated, use lifespan event handlers instead.
  
          Read more about it in the
          [FastAPI docs for Lifespan Events](https://fastapi.tiangolo.com/advanced/events/).
          
    return self.router.on_event(event_type)  # ty: ignore[deprecated]

../../../../../../../opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/pydantic/_internal/_config.py:291
../../../../../../../opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/pydantic/_internal/_config.py:291
../../../../../../../opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/pydantic/_internal/_config.py:291
  /opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/site-packages/pydantic/_internal/_config.py:291: PydanticDeprecatedSince20: Support for class-based `config` is deprecated, use ConfigDict instead. Deprecated in Pydantic V2.0 to be removed in V3.0. See Pydantic V2 Migration Guide at https://errors.pydantic.dev/2.9/migration/
    warnings.warn(DEPRECATION_MESSAGE, DeprecationWarning)

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html

---------- coverage: platform linux, python 3.12.13-final-0 ----------
Name                                   Stmts   Miss  Cover   Missing
--------------------------------------------------------------------
src/accreditation_api.py                 143     79    45%   36, 45-46, 74-80, 104-113, 127-142, 156-171, 184-190, 214, 233-242, 256-282, 290-296, 308-335
src/accreditation_models.py               47      0   100%
src/analytics_api.py                     174    151    13%   43-81, 98-188, 223-254, 271-319, 336-400, 427-476, 490-549
src/api_keys_ext_api.py                   71     33    54%   69, 81-88, 102-130, 144-161, 165
src/audience_segments_api.py             536    404    25%   154-160, 164-165, 169, 177-179, 183-185, 189-224, 234-239, 243-252, 264-331, 343, 363-364, 376-411, 424-426, 430-474, 484, 496-499, 503, 517, 537, 546-557, 561-565, 569, 573-577, 581-585, 589-594, 598-611, 615-642, 658-700, 713-724, 739-767, 780-786, 802-837, 850-859, 872-881, 900-959, 978-1000, 1020-1033, 1063-1103, 1111-1235, 1261-1296
src/auth_2fa_api.py                      155     99    36%   32, 36, 65-68, 72-76, 80-81, 85, 89-106, 114-125, 134-160, 169-186, 196, 206, 216-234, 239-246, 257-274, 283-290, 301-318
src/automation_api.py                    428    308    28%   105, 165, 169, 173, 186-189, 199-202, 216-222, 226-231, 235-288, 298, 307-308, 312-313, 317-319, 323-336, 340-342, 346-365, 376-399, 403-460, 464-474, 478-480, 500-514, 518-550, 554, 559-686, 691-694, 697-698, 701, 705, 718-720, 729-742, 760-776, 791-804, 818-837, 850-851, 855, 869-883, 904-944
src/badge_template_seeds.py               22     22     0%   15-196
src/cache.py                              50     50     0%   12-86
src/certificate_template_seeds.py         36     36     0%   13-320
src/certificate_templates_api.py         153     97    37%   65-80, 84-91, 95, 99-103, 107-112, 116, 138-140, 155-189, 203-224, 237-242, 256-271, 284-289, 302-309, 321-334
src/checkin_ops_api.py                   222    136    39%   43-47, 111, 115-123, 127-141, 145-157, 161, 190, 220-226, 240-257, 270-279, 293-300, 314-333, 357-449, 497-527, 559-580
src/community_api.py                      94     78    17%   36-50, 54-56, 66-98, 108-145, 188-207, 217-237
src/community_notifications.py            25     25     0%   1-70
src/connections_api.py                   209    108    48%   137, 141-146, 153, 168-208, 227-246, 262-284, 303-325, 342-389, 411-450, 464-483, 491, 500-516
src/crm_accounts_api.py                  269    150    44%   34-39, 132-135, 139-149, 153-154, 174, 182, 213-221, 236-252, 266-268, 283-297, 310-314, 330-353, 369-392, 415-422, 438-447, 460-482, 498-514, 529-543, 556-562, 578-589, 612-626, 644-653
src/crm_accounts_models.py                55      0   100%
src/crm_sequences_api.py                 236    136    42%   31, 35-38, 136, 140-147, 151-158, 162-164, 188-196, 211-231, 246-268, 281-287, 302-338, 352-373, 389-397, 408-451
src/crm_snapshot_hooks.py                 98     98     0%   3-222
src/document_export_jobs.py              215    139    35%   95, 112-117, 127-163, 172-176, 185, 194-202, 206-225, 230-233, 236, 240-281, 285-324, 328-341, 345-351, 355-366
src/document_outputs.py                  234    196    16%   25-29, 33, 58-59, 74-90, 94-98, 102-110, 120-129, 147-194, 198-208, 212-234, 252-277, 281, 285-298, 302-309, 313-331, 335-357, 361, 365-368, 372, 384-399, 410-413, 424-425, 429-435
src/document_outputs_api.py               27      5    81%   33-48, 56-68
src/domains.py                            54     24    56%   37-41, 45-47, 51-53, 57-63, 67-72
src/domains_api.py                       165    108    35%   32-37, 41-58, 62-65, 75-78, 101-102, 106, 120-134, 139-141, 146-150, 155-164, 169-176, 185-188, 197-206, 211-241, 245-251
src/email_api.py                         625    506    19%   81-119, 145-177, 190-213, 230-237, 253-268, 284-300, 314-325, 341-394, 409-415, 430, 444-469, 481-484, 509-543, 566-641, 656-665, 679-686, 708-796, 819-829, 857-873, 889-917, 932-950, 979-998, 1030-1090, 1112-1179, 1198-1206, 1224-1249, 1265-1287, 1315-1331, 1342-1358, 1367-1375, 1387-1388, 1401-1412, 1425-1433, 1446-1456, 1471-1473, 1491-1497, 1514-1662, 1674-1689, 1701-1726, 1732, 1762-1776, 1788-1789, 1798, 1802-1816, 1828-1829, 1838
src/email_rendering.py                    38     27    29%   13, 17, 21-23, 27-32, 47-63, 88
src/email_template_presets.py              6      0   100%
src/event_crm_api.py                    1069    778    27%   212, 216, 220, 224, 237, 250-253, 257, 261-264, 268-275, 279-288, 292-307, 322-398, 402-408, 412-425, 429-430, 434-437, 441, 445-446, 450-451, 455-459, 463-468, 472-484, 488-507, 511-521, 525-533, 544-591, 604-624, 642-653, 668-681, 696-706, 719-725, 743-865, 879-945, 971-972, 985-988, 1006-1016, 1028-1032, 1044-1057, 1071-1111, 1125-1191, 1204-1261, 1275-1347, 1361-1382, 1396-1466, 1480-1487, 1513-1526, 1559-1622, 1646-1725, 1749-1758, 1790, 1794-1801, 1813-1833, 1846-1849, 1868-1877, 1889-1893, 1907-1977, 2008, 2012-2013, 2017-2018, 2031-2034, 2054-2064, 2076-2080, 2094-2163, 2191-2263, 2278-2279, 2295-2299
src/event_features.py                     37     23    38%   31-32, 36-48, 52-53, 57, 61, 65, 69, 73, 77
src/generator.py                         251    209    17%   53, 65-89, 96-112, 122-156, 166-298, 318-394, 412-427, 449-466
src/i18n.py                               16     11    31%   63-69, 74-77
src/lead_forms_api.py                    163     86    47%   35-38, 42-47, 116-124, 139-155, 169-171, 186-197, 210-214, 230-240, 247-252, 272-329, 335-338, 342-350, 354, 371
src/lead_forms_models.py                  35      0   100%
src/learning_path_api.py                 241    185    23%   72-76, 80-90, 94-104, 108, 127-144, 161-186, 197-205, 217-231, 244-253, 267-290, 302-308, 320-333, 364-391, 401-423, 433-535, 554-594
src/learning_path_models.py               50      0   100%
src/lms_api.py                           542    391    28%   121-214, 225-246, 255-274, 278, 294-300, 306-318, 329-353, 375-383, 407-429, 448-457, 473-481, 493-510, 522-523, 536-544, 556-559, 577-592, 606-621, 634-645, 662-695, 704-741, 750-784, 795-880, 889-897, 940, 964-972, 984-1001, 1013-1022, 1035-1064, 1076-1085, 1107-1114, 1132-1142, 1165-1178, 1206-1217, 1231-1254, 1263-1282, 1303-1336
src/lms_extended_api.py                  632    405    36%   70-76, 80-88, 94-110, 114-124, 155-161, 171-184, 195-207, 217-225, 235-242, 269-299, 303, 340-346, 356-367, 377-387, 398-418, 429-439, 443, 457, 508-513, 523-528, 539-558, 568-601, 611-619, 630-641, 645, 696-701, 710-721, 731-741, 750-756, 765-771, 788-804, 814-823, 827, 854-859, 878-888, 899-917, 928-936, 972-976, 985-998, 1008-1018, 1027-1033, 1043-1058, 1067-1077, 1081, 1122-1128, 1138-1152, 1162-1170, 1179-1183, 1193-1204, 1208, 1246-1253, 1262-1273, 1283-1288, 1297-1300, 1304, 1326-1384, 1410-1447, 1478-1511, 1528-1564, 1580-1596, 1622-1627, 1636-1645, 1655-1674, 1685-1705, 1718-1723, 1737-1771
src/lms_extended_models.py               188      0   100%
src/lms_models.py                        163      0   100%
src/local_bootstrap.py                    46     46     0%   1-68
src/lti_api.py                           128     74    42%   85-98, 110-142, 151-155, 159, 185-189, 202-215, 228-248, 260-268, 279-311
src/main.py                            10303   6993    32%   45-46, 50-51, 115-137, 142-144, 147-155, 158-163, 166-167, 170, 173, 176-178, 181-197, 205-227, 231-242, 320, 1013-1026, 1034-1059, 1066-1103, 1110-1143, 1147-1228, 2211-2214, 2225-2228, 2306-2315, 2319-2326, 2337-2340, 2345, 2356-2361, 2366, 2371-2376, 2665-2668, 3038-3056, 3090-3095, 3379, 3555-3558, 3561-3564, 3567-3570, 3574-3578, 3585-3589, 3593-3597, 3622, 3626, 3634-3636, 3640, 3645, 3649, 3666-3675, 3679-3684, 3688-3693, 3697, 3701-3721, 3725-3727, 3731-3735, 3739-3750, 3754-3757, 3761, 3789, 3793-3797, 3801-3803, 3807-3808, 3812-3814, 3818-3823, 3827-3828, 3832-3845, 3849-3856, 3860-3901, 3905, 3909, 3919-3935, 3939-3945, 3949-3953, 3957-3960, 3964-3973, 3977-3990, 3994-4007, 4016-4071, 4075-4090, 4094-4099, 4107, 4111-4115, 4119-4120, 4124-4126, 4130-4135, 4139-4140, 4144-4162, 4166-4173, 4177-4213, 4217-4238, 4242-4243, 4247-4259, 4263-4293, 4297-4302, 4306-4311, 4336, 4358-4412, 4420-4513, 4565-4782, 4786, 4790-4794, 4804-4885, 4889-4894, 4912-5008, 5019-5028, 5035-5038, 5042-5045, 5050-5053, 5057-5058, 5079, 5083-5156, 5163-5181, 5194-5199, 5206, 5211-5213, 5217-5223, 5227-5229, 5233-5241, 5250-5296, 5304-5325, 5333-5356, 5365-5390, 5394-5396, 5401-5420, 5424, 5433-5440, 5444-5449, 5456-5464, 5468-5483, 5487-5490, 5494-5511, 5522-5533, 5551-5553, 5567, 5593-5600, 5609-5695, 5700-5704, 5709-6614, 6619-6620, 6624, 6635-6653, 6678-6823, 6827-6918, 6922-6923, 6927-6930, 6934-6940, 6944-6945, 6949-6953, 6957-6965, 6969-6974, 6978-6983, 6987-6991, 7021-7022, 7026-7030, 7040, 7044, 7048, 7057-7059, 7063-7065, 7069-7071, 7075-7080, 7084, 7088-7102, 7106-7111, 7115-7120, 7124-7129, 7133-7136, 7145-7146, 7162-7248, 7252-7271, 7275-7318, 7322-7332, 7336-7337, 7341-7345, 7349-7356, 7360-7609, 7613-7630, 7636-7639, 7651-7684, 7694-7709, 7721-7769, 7777-7817, 7827-7857, 7875-7903, 7916-7941, 7955-7980, 7989-8019, 8029-8161, 8179-8207, 8217-8229, 8240-8280, 8294-8325, 8338-8398, 8408-8418, 8430-8527, 8536-8602, 8615-8635, 8670-8692, 8702-8717, 8734-8764, 8776-8798, 8810-8824, 8835, 8840-8872, 8899-9033, 9042-9091, 9100-9130, 9135-9158, 9164-9185, 9189-9192, 9196-9210, 9218-9229, 9234-9248, 9252, 9260-9278, 9287-9381, 9397-9401, 9421-9440, 9451-9517, 9533-9537, 9557-9575, 9586-9649, 9659-9694, 9700-9722, 9730-9753, 9759-9780, 9786-9805, 9811-9832, 9838-9856, 9862-9885, 10040-10041, 10045-10076, 10080-10084, 10088-10104, 10108-10109, 10113-10122, 10126-10142, 10146-10385, 10566-10584, 10588-10610, 10614-10737, 10741-10751, 10764-10769, 10784-10805, 10825-10849, 10862-10865, 10880-10901, 10914-10926, 10939-10977, 10985-10987, 11005-11019, 11038-11052, 11065-11073, 11083-11091, 11100-11107, 11112-11120, 11129-11141, 11147-11149, 11159-11163, 11168-11172, 11177-11186, 11227-11254, 11267-11269, 11274-11283, 11310, 11324-11390, 11405-11494, 11499-11503, 11511-11520, 11545-11549, 11566-11575, 11590-11592, 11601-11642, 11655-11694, 11706-11710, 11730-11734, 11743-11750, 11759-11781, 11802-11815, 11836-11879, 11903-11915, 11924-11946, 11954-11983, 12011-12017, 12026-12035, 12044-12070, 12075-12119, 12123-12133, 12137-12144, 12157-12220, 12231-12275, 12279-12280, 12314-12362, 12374-12386, 12390-12449, 12453-12472, 12487-12490, 12494, 12503-12527, 12537-12538, 12549-12682, 12712-12719, 12732-12762, 12783-12834, 12842-12884, 12906-12929, 12942-12959, 12963-12979, 12983-13003, 13016-13060, 13064-13068, 13091-13092, 13105-13107, 13120-13125, 13138-13143, 13147-13151, 13175-13176, 13189-13191, 13204-13209, 13222-13227, 13239-13401, 13411-13420, 13430-13471, 13481-13490, 13500-13532, 13547-13622, 13635-13642, 13656-13667, 13680-13698, 13711-13729, 13739-13866, 13909-13970, 14004-14016, 14019-14023, 14027-14029, 14038-14064, 14068-14088, 14092, 14104-14106, 14111-14147, 14157-14168, 14173-14175, 14193-14213, 14228-14234, 14241-14272, 14295-14358, 14377-14381, 14409-14584, 14599-14651, 14663-14682, 14696-14755, 14772-14822, 14843-14901, 14921-14972, 15002-15022, 15032-15071, 15088-15094, 15108-15128, 15136-15158, 15178-15186, 15199-15225, 15303-15304, 15308-15314, 15322-15342, 15357, 15399-15409, 15504-15506, 15510, 15526-15537, 15546-15560, 15564-15570, 15574-15575, 15579-15580, 15584-15585, 15589-15594, 15598, 15602-15625, 15629-15649, 15659-15679, 15683, 15698-15700, 15711-15712, 15727-15736, 15747-15751, 15755-15763, 15766-15780, 15785-15789, 15793-15808, 15812-15815, 15819-15829, 15833-15972, 15976-15977, 15981-16076, 16083-16096, 16106-16139, 16167-16179, 16185-16188, 16204, 16255, 16279-16348, 16378-16395, 16400-16411, 16423-16451, 16463-16488, 16493-16500, 16511-16538, 16542-16569, 16580-16632, 16650-17060, 17065-17139, 17156-17181, 17188-17195, 17219-17298, 17342-17390, 17401-17427, 17436-17443, 17452-17459, 17470-17493, 17504-17515, 17525-17544, 17555-17573, 17583-17591, 17601-17611, 17624-17664, 17680-17720, 17734-17842, 17859-17869, 17885-17993, 18012-18025, 18044-18051, 18062-18083, 18105-18130, 18152-18194, 18208-18264, 18290-18301, 18318-18390, 18401-18463, 18516-18546, 18559-18570, 18583-18595, 18616-18628, 18642-18675, 18695-18741, 18759-18775, 18789-18825, 18844-18882, 18900-18964, 18982-19003, 19020-19117, 19142-19346, 19371-19424, 19441-19448, 19464-19468, 19472-19474, 19490-19497, 19505-19506, 19510-19523, 19542-19560, 19577-19612, 19622-19679, 19684-19693, 19707-19713, 19729-19750, 19754-19763, 19772-19808, 19812-19863, 19872-19885, 19891-19892, 19896, 19900-19901, 19919-19923, 19927-19937, 19941-19948, 19958-19974, 19988-20021, 20031-20065, 20074-20096, 20105-20129, 20138-20152, 20216, 20246-20269, 20292-20423, 20438-20440
src/marketplace_api.py                   114     63    45%   69-70, 96-114, 119, 124-133, 148-164, 173, 198-221, 226-239, 259-272
src/member_certificates_api.py           119     75    37%   65, 79, 83-94, 106-130, 138-154, 158-195, 206-212, 220-228, 241-249, 258-270, 278, 287-290
src/moderation.py                         45     33    27%   60-61, 65-79, 83-103
src/notification_integrations_api.py     531    350    34%   87-92, 97-100, 114-117, 130-133, 222-225, 229-230, 234-235, 239-241, 245, 249-250, 254-255, 259-264, 268-272, 276-284, 288-292, 296-298, 302-304, 308-310, 314-316, 320-322, 326-328, 332, 336, 340-343, 347-350, 354-357, 366-367, 377-380, 384-392, 396-414, 418-431, 443-481, 492-496, 509-638, 651-660, 678-712, 725-747, 760-762, 782-799, 812-818, 832-838, 860-872, 876-895, 899-918, 922, 936-949, 973-1025
src/oidc_sso_api.py                      108     85    21%   50, 54-59, 68-81, 85-106, 116-137, 147-211
src/org_analytics_api.py                  87     65    25%   35, 41, 56-137, 158-198, 217-262, 276-320, 343-361
src/org_modules_api.py                    49     24    51%   41-45, 70-71, 84-89, 101-117
src/org_staff_api.py                     128     80    38%   88-92, 96, 110-138, 154-161, 174-205, 218-235, 247-256, 264-294
src/organization_access_api.py           244    157    36%   67-76, 80-85, 89, 100-103, 108, 119-124, 129, 134-139, 164, 176-187, 191-204, 208-209, 221-228, 237-287, 291-297, 301-347, 356-366, 375, 384-390, 405-442, 457-471, 484-495
src/payments.py                          196    136    31%   90-92, 96, 99-100, 107-109, 112-177, 181-224, 244-246, 250, 253-255, 258-297, 300-313, 333-334, 338, 341-369, 372-406, 422-444
src/plan_policy.py                        37     20    46%   42, 46-53, 57-66, 70
src/platform_health_api.py                19      9    53%   25, 30-45
src/product_observability.py              16      8    50%   22-35
src/product_telemetry.py                  12      8    33%   19-26
src/product_telemetry_api.py              27      8    70%   33-48, 53-61
src/qa_seed_api.py                        39     28    28%   35-82
src/quiz_api.py                          316    238    25%   114-135, 151, 166-172, 176-186, 191-332, 351-403, 416-423, 435-439, 451-453, 465-480, 502-525, 540-577, 588-632, 645-714, 729-740
src/quiz_models.py                        65      0   100%
src/report_scheduler_api.py              100     55    45%   41-48, 52-57, 85, 111-119, 134-153, 161, 176-197, 210-216
src/report_scheduler_models.py            23      0   100%
src/signing.py                            42     42     0%   7-121
src/social_api.py                        223    163    27%   112-126, 135-146, 151, 155-160, 164-179, 184-187, 196-256, 266-285, 296-307, 318-327, 348, 360-367, 376-388, 397-409, 418-428, 437-448, 460-489, 500-514, 522-551, 560-568, 592-602
src/sso_api.py                           170    115    32%   113-117, 121-127, 140-141, 157-161, 177-199, 212-231, 243-251, 266-294, 305-400
src/tickets_api.py                       128    100    22%   47-56, 70-95, 100-111, 123-140, 152-165, 185-193, 208-285, 300-330
src/training_api.py                      566    349    38%   40-65, 248-251, 255-258, 262-270, 274-277, 281-286, 290-293, 297, 310, 329, 343-348, 352-362, 366-386, 390-393, 428-431, 441-446, 467-499, 513-518, 533-546, 561-571, 585-590, 605-624, 638-659, 672-680, 695-712, 725-783, 801-817, 831-843, 858-863, 876-880, 893-915, 936-986, 1004-1022, 1029-1091, 1103-1104, 1119-1129
src/venue_reservations_api.py            126     63    50%   46-50, 70-80, 84-93, 102-112, 125-134, 149-169, 184-201, 214-227, 231, 235-237, 249-282
src/venues_api.py                        101     45    55%   42-45, 50-53, 71, 75-85, 94-101, 110-116, 126-141, 156-170, 178-189
src/watermark.py                          83     83     0%   25-182
src/webhooks.py                           96     67    30%   39, 44-45, 50-70, 81-97, 112-186
--------------------------------------------------------------------
TOTAL                                  22061  14685    33%
Coverage HTML written to dir htmlcov
Coverage XML written to file coverage.xml

=========================== short test summary info ============================
ERROR tests/test_api.py::TestHealthEndpoint::test_health_returns_ok - sqlalchemy.exc.CompileError: (in table 'crm_accounts', column 'tags'): Compiler <sqlalchemy.dialects.sqlite.base.SQLiteTypeCompiler object at 0x7fc69d671a90> can't render element of type JSONB
!!!!!!!!!!!!!!!!!!!!!!!!!! stopping after 1 failures !!!!!!!!!!!!!!!!!!!!!!!!!!!
======================== 6 warnings, 1 error in 31.66s =========================