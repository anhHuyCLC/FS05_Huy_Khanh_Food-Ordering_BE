/**
 * Danh sách features - khi thêm tính năng mới, thêm vào đây.
 * Chạy: yarn db:seed
 */
import {
  assignPermissionToRole,
  ensureRole,
  registerFeature,
  setFeatureParents,
} from "./registerFeature";

export const FEATURES = [
  {
    code: "AM",
    name: "Administration Management",
    description: "Quản lý users, permissions, roles",
    type: "MENU_GROUP",
    parentCode: null as string | null,
    sortOrder: 0,
  },
  {
    code: "UM",
    name: "User Management",
    description: "Quản lý tài khoản người dùng",
    type: "FEATURE",
    parentCode: "AM",
    sortOrder: 0,
  },
  {
    code: "TASK",
    name: "Task",
    description: "Quản lý công việc",
    type: "MENU_GROUP",
    parentCode: null as string | null,
    sortOrder: 1,
  },
  {
    code: "TASK_TYPE",
    name: "Task Type",
    description: "Loại công việc",
    type: "FEATURE",
    parentCode: "TASK",
    sortOrder: 0,
  },
  {
    code: "CHAT",
    name: "Chat",
    description: "Real-time chat",
    type: "FEATURE",
    parentCode: null as string | null,
    sortOrder: 2,
  },
  {
    code: "ADDRESS",
    name: "Address Management",
    description: "Quản lý địa chỉ giao hàng",
    type: "FEATURE",
    parentCode: null as string | null,
    sortOrder: 3,
  },
  {
    code: "CART",
    name: "Cart Management",
    description: "Quản lý giỏ hàng",
    type: "FEATURE",
    parentCode: null as string | null,
    sortOrder: 4,
  },
  {
    code: "MENU",
    name: "Menu Management",
    description: "Quản lý thực đơn",
    type: "FEATURE",
    parentCode: null as string | null,
    sortOrder: 5,
  },
  {
    code: "ORDER",
    name: "Order Management",
    description: "Quản lý đơn hàng",
    type: "FEATURE",
    parentCode: null as string | null,
    sortOrder: 6,
  },
  {
    code: "DRIVER_PROFILE",
    name: "Driver Profile",
    description: "Hồ sơ tài xế",
    type: "FEATURE",
    parentCode: null as string | null,
    sortOrder: 7,
  },
  {
    code: "RESTAURANT_PROFILE",
    name: "Restaurant Profile",
    description: "Hồ sơ đối tác nhà hàng",
    type: "FEATURE",
    parentCode: null as string | null,
    sortOrder: 8,
  },
];

export async function seedFeatures() {
  for (const def of FEATURES) {
    await registerFeature(def);
  }
  await setFeatureParents(FEATURES);

  // Role ADMIN phải tồn tại trước khi gán permission (tạo nếu chưa có)
  await ensureRole(
    "ADMIN",
    "Administrator",
    "Full access to admin and user management",
  );

  // Role CUSTOMER (cho người dùng thường)
  await ensureRole(
    "CUSTOMER",
    "Customer",
    "Standard user role for customers",
  );

  // Role DRIVER (cho tài xế)
  await ensureRole(
    "DRIVER",
    "Driver",
    "Driver role for delivery partners",
  );

  // Role RESTAURANT (cho quán ăn)
  await ensureRole(
    "RESTAURANT",
    "Restaurant",
    "Restaurant partner role",
  );

  // ADMIN role has full permissions for all features
  for (const feature of FEATURES) {
    await assignPermissionToRole("ADMIN", feature.code);
  }

  // CUSTOMER role permissions
  await assignPermissionToRole("CUSTOMER", "CHAT");
  await assignPermissionToRole("CUSTOMER", "ADDRESS");
  await assignPermissionToRole("CUSTOMER", "CART");
  await assignPermissionToRole("CUSTOMER", "MENU", ["READ"]);
  await assignPermissionToRole("CUSTOMER", "ORDER", ["READ", "CREATE", "UPDATE"]);

  // RESTAURANT role permissions
  await assignPermissionToRole("RESTAURANT", "CHAT");
  await assignPermissionToRole("RESTAURANT", "MENU");
  await assignPermissionToRole("RESTAURANT", "ORDER", ["READ", "UPDATE"]);
  await assignPermissionToRole("RESTAURANT", "RESTAURANT_PROFILE", ["READ", "UPDATE"]);

  // DRIVER role permissions
  await assignPermissionToRole("DRIVER", "CHAT");
  await assignPermissionToRole("DRIVER", "ORDER", ["READ", "UPDATE"]);
  await assignPermissionToRole("DRIVER", "DRIVER_PROFILE", ["READ", "UPDATE"]);

  console.log("[seedFeatures] Done");
}
