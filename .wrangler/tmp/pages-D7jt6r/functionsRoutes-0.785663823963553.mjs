import { onRequest as __api_admin_app_links_js_onRequest } from "D:\\Coding\\appvibe.biz.id\\functions\\api\\admin\\app-links.js"
import { onRequest as __api_admin_orders_js_onRequest } from "D:\\Coding\\appvibe.biz.id\\functions\\api\\admin\\orders.js"
import { onRequest as __api_auth_consume_magic_link_js_onRequest } from "D:\\Coding\\appvibe.biz.id\\functions\\api\\auth\\consume-magic-link.js"
import { onRequest as __api_auth_logout_js_onRequest } from "D:\\Coding\\appvibe.biz.id\\functions\\api\\auth\\logout.js"
import { onRequest as __api_auth_request_magic_link_js_onRequest } from "D:\\Coding\\appvibe.biz.id\\functions\\api\\auth\\request-magic-link.js"
import { onRequest as __api_checkout_create_order_js_onRequest } from "D:\\Coding\\appvibe.biz.id\\functions\\api\\checkout\\create-order.js"
import { onRequest as __api_checkout_create_upgrade_order_js_onRequest } from "D:\\Coding\\appvibe.biz.id\\functions\\api\\checkout\\create-upgrade-order.js"
import { onRequest as __api_checkout_status_js_onRequest } from "D:\\Coding\\appvibe.biz.id\\functions\\api\\checkout\\status.js"
import { onRequest as __api_member_launch_js_onRequest } from "D:\\Coding\\appvibe.biz.id\\functions\\api\\member\\launch.js"
import { onRequest as __api_member_me_js_onRequest } from "D:\\Coding\\appvibe.biz.id\\functions\\api\\member\\me.js"
import { onRequest as __api_member_resource_js_onRequest } from "D:\\Coding\\appvibe.biz.id\\functions\\api\\member\\resource.js"
import { onRequest as __api_webhooks_paycore_js_onRequest } from "D:\\Coding\\appvibe.biz.id\\functions\\api\\webhooks\\paycore.js"
import { onRequest as __api_access_js_onRequest } from "D:\\Coding\\appvibe.biz.id\\functions\\api\\access.js"

export const routes = [
    {
      routePath: "/api/admin/app-links",
      mountPath: "/api/admin",
      method: "",
      middlewares: [],
      modules: [__api_admin_app_links_js_onRequest],
    },
  {
      routePath: "/api/admin/orders",
      mountPath: "/api/admin",
      method: "",
      middlewares: [],
      modules: [__api_admin_orders_js_onRequest],
    },
  {
      routePath: "/api/auth/consume-magic-link",
      mountPath: "/api/auth",
      method: "",
      middlewares: [],
      modules: [__api_auth_consume_magic_link_js_onRequest],
    },
  {
      routePath: "/api/auth/logout",
      mountPath: "/api/auth",
      method: "",
      middlewares: [],
      modules: [__api_auth_logout_js_onRequest],
    },
  {
      routePath: "/api/auth/request-magic-link",
      mountPath: "/api/auth",
      method: "",
      middlewares: [],
      modules: [__api_auth_request_magic_link_js_onRequest],
    },
  {
      routePath: "/api/checkout/create-order",
      mountPath: "/api/checkout",
      method: "",
      middlewares: [],
      modules: [__api_checkout_create_order_js_onRequest],
    },
  {
      routePath: "/api/checkout/create-upgrade-order",
      mountPath: "/api/checkout",
      method: "",
      middlewares: [],
      modules: [__api_checkout_create_upgrade_order_js_onRequest],
    },
  {
      routePath: "/api/checkout/status",
      mountPath: "/api/checkout",
      method: "",
      middlewares: [],
      modules: [__api_checkout_status_js_onRequest],
    },
  {
      routePath: "/api/member/launch",
      mountPath: "/api/member",
      method: "",
      middlewares: [],
      modules: [__api_member_launch_js_onRequest],
    },
  {
      routePath: "/api/member/me",
      mountPath: "/api/member",
      method: "",
      middlewares: [],
      modules: [__api_member_me_js_onRequest],
    },
  {
      routePath: "/api/member/resource",
      mountPath: "/api/member",
      method: "",
      middlewares: [],
      modules: [__api_member_resource_js_onRequest],
    },
  {
      routePath: "/api/webhooks/paycore",
      mountPath: "/api/webhooks",
      method: "",
      middlewares: [],
      modules: [__api_webhooks_paycore_js_onRequest],
    },
  {
      routePath: "/api/access",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_access_js_onRequest],
    },
  ]