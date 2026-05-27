import models from "@models";
import { Prisma } from "@db";

export async function seedMenuItems() {
  console.log("🌱 Seeding menu items...");

  const categories = await models.category.findMany({
    include: {
      restaurant: true,
    },
  });

  // Map: category name → danh sách món ăn với ảnh Unsplash cụ thể
  const dishesMap: Record<
    string,
    { name: string; desc: string; price: number; img: string }[]
  > = {
    // ─── Món Việt / Vietnamese / Food ────────────────────────────────────────
    "Món Việt": [
      {
        name: "Mì Quảng Ếch",
        desc: "Đặc sản mì quảng ếch đồng nguyên thố",
        price: 45000,
        img: "https://images.unsplash.com/photo-1552611052-33e04de081de?w=400&q=80",
      },
      {
        name: "Bánh Xèo Tôm Nhảy",
        desc: "Bánh xèo miền Trung giòn rụm nhân tôm tươi",
        price: 55000,
        img: "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&q=80",
      },
      {
        name: "Bún Mắm Nêm",
        desc: "Bún mắm thịt luộc heo quay đặc sản Đà Nẵng",
        price: 35000,
        img: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&q=80",
      },
    ],
    Vietnamese: [
      {
        name: "Bánh Tráng Cuốn Thịt Heo",
        desc: "Thịt heo hai đầu da, rau rừng, bánh tráng mỏng",
        price: 120000,
        img: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80",
      },
      {
        name: "Nem Lụi Nướng",
        desc: "Nem lụi nướng sả (5 lụi), chấm mắm nêm",
        price: 40000,
        img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80",
      },
    ],
    // ─── Cơm / Rice / Rice-box ───────────────────────────────────────────────
    Cơm: [
      {
        name: "Cơm Tấm Sườn Bì Chả",
        desc: "Sườn nướng mềm, bì chả nhà làm, nước mắm pha đặc biệt",
        price: 55000,
        img: "https://images.unsplash.com/photo-1599046679481-60e1f9c6b0c8?w=400&q=80",
      },
      {
        name: "Cơm Tấm Ba Chỉ Quay",
        desc: "Thịt heo quay giòn da ăn kèm dưa cải",
        price: 50000,
        img: "https://images.unsplash.com/photo-1543352634-99a5d50ae78e?w=400&q=80",
      },
      {
        name: "Cơm Tấm Đùi Gà Nướng",
        desc: "Đùi gà nướng xốt mật ong thơm phức",
        price: 55000,
        img: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&q=80",
      },
    ],
    Rice: [
      {
        name: "Cơm Hộp Gà Chiên Nước Mắm",
        desc: "Gà chiên giòn xốt nước mắm tỏi ớt",
        price: 45000,
        img: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&q=80",
      },
      {
        name: "Cơm Hộp Thịt Kho Trứng",
        desc: "Thịt ba chỉ kho trứng vị đậm đà truyền thống",
        price: 40000,
        img: "https://images.unsplash.com/photo-1516684669134-de6f7a8b0e36?w=400&q=80",
      },
    ],
    // ─── Mì / Pho / Noodles ─────────────────────────────────────────────────
    Mì: [
      {
        name: "Mì Quảng Gà Quê",
        desc: "Mì quảng gà ta thả vườn dai ngon",
        price: 40000,
        img: "https://images.unsplash.com/photo-1552611052-33e04de081de?w=400&q=80",
      },
      {
        name: "Bún Bò Huế Đặc Biệt",
        desc: "Gân, nạm, chả, giò heo – tô đầy đủ nhất",
        price: 65000,
        img: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&q=80",
      },
    ],
    Pho: [
      {
        name: "Phở Bò Tái Nạm",
        desc: "Phở nước trong thanh ngọt, cốt xương bò hầm 12 tiếng",
        price: 50000,
        img: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&q=80",
      },
      {
        name: "Phở Đặc Biệt",
        desc: "Tái, nạm, gầu, gân, bò viên – đầy đủ nhất",
        price: 70000,
        img: "https://images.unsplash.com/photo-1600682911954-b5fe2aa9d1cf?w=400&q=80",
      },
    ],
    Noodles: [
      {
        name: "Mì Xào Hải Sản",
        desc: "Mì vàng xào giòn với tôm mực tươi",
        price: 75000,
        img: "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&q=80",
      },
      {
        name: "Bún Riêu Cua",
        desc: "Bún riêu cua đồng nguyên chất, đậu phụ chiên",
        price: 45000,
        img: "https://images.unsplash.com/photo-1552611052-33e04de081de?w=400&q=80",
      },
    ],
    // ─── Trà Sữa / Milk Tea ──────────────────────────────────────────────────
    "Trà sữa": [
      {
        name: "Trà Sữa Trân Châu Đen",
        desc: "Trà sữa truyền thống signature Gong Cha",
        price: 45000,
        img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
      },
      {
        name: "Hồng Trà Macchiato",
        desc: "Hồng trà kem cheese béo ngậy",
        price: 50000,
        img: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&q=80",
      },
      {
        name: "Trà Sữa Khoai Môn",
        desc: "Vị khoai môn bùi béo, trân châu dẻo",
        price: 45000,
        img: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80",
      },
    ],
    "Milk Tea": [
      {
        name: "Brown Sugar Boba",
        desc: "Trà sữa đường đen trân châu nóng giòn",
        price: 55000,
        img: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&q=80",
      },
      {
        name: "Matcha Latte Trân Châu",
        desc: "Trà xanh Nhật Bản pha sữa tươi",
        price: 55000,
        img: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&q=80",
      },
    ],
    Boba: [
      {
        name: "Trà Đào Cam Sả",
        desc: "Thanh mát giải nhiệt mùa hè",
        price: 45000,
        img: "https://images.unsplash.com/photo-1532704868953-d85dfd4f3a24?w=400&q=80",
      },
      {
        name: "Trân Châu Trắng (add-on)",
        desc: "Trân châu giòn sần sật thêm vào thức uống",
        price: 10000,
        img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
      },
    ],
    // ─── Coffee / Cafe ───────────────────────────────────────────────────────
    Coffee: [
      {
        name: "Cà Phê Sữa Đá",
        desc: "Cà phê pha phin truyền thống đậm vị",
        price: 29000,
        img: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400&q=80",
      },
      {
        name: "Bạc Xỉu Đá",
        desc: "Bạc xỉu ba tầng thơm béo",
        price: 29000,
        img: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80",
      },
      {
        name: "Cold Brew",
        desc: "Cà phê ủ lạnh 24h, vị êm dịu không đắng",
        price: 45000,
        img: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400&q=80",
      },
    ],
    "Cà phê": [
      {
        name: "Cà Phê Đen Đá",
        desc: "Cà phê đậm vị nguyên chất, không đường",
        price: 25000,
        img: "https://images.unsplash.com/photo-1518057111178-44a106bad636?w=400&q=80",
      },
      {
        name: "Cappuccino",
        desc: "Espresso pha sữa tươi tạo bọt mịn",
        price: 55000,
        img: "https://images.unsplash.com/photo-1534040385115-33dcb3acba5b?w=400&q=80",
      },
    ],
    // ─── Drinks / Beverages ──────────────────────────────────────────────────
    Drinks: [
      {
        name: "Pepsi / Coca",
        desc: "Nước ngọt có gas lon 330ml",
        price: 15000,
        img: "https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=400&q=80",
      },
      {
        name: "Nước Suối",
        desc: "Nước suối Aquafina 500ml",
        price: 10000,
        img: "https://images.unsplash.com/photo-1502741338009-cac2772e18bc?w=400&q=80",
      },
      {
        name: "Sữa Đậu Nành",
        desc: "Sữa đậu nành nguyên chất nóng/đá",
        price: 15000,
        img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80",
      },
    ],
    Beverage: [
      {
        name: "Nước Ép Cam",
        desc: "Cam vắt tươi 100%, không đường",
        price: 35000,
        img: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&q=80",
      },
      {
        name: "Sinh Tố Bơ",
        desc: "Bơ sáp Đắk Lắk, sữa đặc béo ngậy",
        price: 45000,
        img: "https://images.unsplash.com/photo-1553530666-ba11a90a0868?w=400&q=80",
      },
    ],
    // ─── Pizza / Burger / Fast Food ──────────────────────────────────────────
    Pizza: [
      {
        name: "Pizza Hải Sản",
        desc: "Đế giòn phủ tôm mực sốt cà chua thơm",
        price: 199000,
        img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80",
      },
      {
        name: "Pizza Phô Mai 4 Loại",
        desc: "Mozzarella, Cheddar, Gouda, Parmesan",
        price: 189000,
        img: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=400&q=80",
      },
      {
        name: "Pizza BBQ Gà",
        desc: "Đế dày sốt BBQ gà nướng ớt chuông",
        price: 179000,
        img: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80",
      },
    ],
    Burger: [
      {
        name: "Classic Beef Burger",
        desc: "Bò Mỹ, rau xà lách, cà chua, sốt đặc biệt",
        price: 89000,
        img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80",
      },
      {
        name: "Crispy Chicken Burger",
        desc: "Gà giòn sốt cay Hàn Quốc",
        price: 79000,
        img: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&q=80",
      },
    ],
    "Fast Food": [
      {
        name: "Khoai Tây Chiên (M)",
        desc: "Khoai tây giòn rụm ăn kèm tương cà",
        price: 35000,
        img: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=80",
      },
      {
        name: "Combo Gà + Khoai + Nước",
        desc: "Gà rán + khoai tây vừa + Pepsi 32oz",
        price: 119000,
        img: "https://images.unsplash.com/photo-1562802378-063ec186a863?w=400&q=80",
      },
    ],
    American: [
      {
        name: "Hot Dog Phô Mai",
        desc: "Xúc xích bò nướng, phô mai chảy, hành phi",
        price: 65000,
        img: "https://images.unsplash.com/photo-1619740455993-9e612b1af08a?w=400&q=80",
      },
    ],
    // ─── Lẩu / Hotpot ───────────────────────────────────────────────────────
    Lẩu: [
      {
        name: "Lẩu Thái Hải Sản",
        desc: "Lẩu chua cay tôm mực nghêu, nước dùng Tom Yum chuẩn vị",
        price: 250000,
        img: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&q=80",
      },
      {
        name: "Lẩu Bò Nhúng Dấm",
        desc: "Bò Mỹ nhúng nước me chua, rau thập cẩm",
        price: 280000,
        img: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80",
      },
    ],
    Hotpot: [
      {
        name: "Lẩu Nấm Chay",
        desc: "Nấm đông cô, nấm hương, nước dùng thanh ngọt",
        price: 180000,
        img: "https://images.unsplash.com/photo-1604908177522-4f7ef28b7e44?w=400&q=80",
      },
    ],
    BBQ: [
      {
        name: "Nướng Ba Chỉ Heo",
        desc: "Ba chỉ heo ướp sả tỏi nướng than hoa",
        price: 120000,
        img: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400&q=80",
      },
      {
        name: "Nướng Tôm Sú",
        desc: "Tôm sú nướng muối ớt giòn ngọt",
        price: 160000,
        img: "https://images.unsplash.com/photo-1519984388953-d2406bc725e1?w=400&q=80",
      },
    ],
    // ─── Sushi / Japanese ────────────────────────────────────────────────────
    Sushi: [
      {
        name: "Sashimi Cá Hồi (8 miếng)",
        desc: "Cá hồi Na Uy nhập khẩu tươi cắt dày",
        price: 180000,
        img: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&q=80",
      },
      {
        name: "Sushi Roll Spicy Tuna",
        desc: "Cá ngừ cay cuộn cơm sushi, phủ trứng cá",
        price: 120000,
        img: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=400&q=80",
      },
      {
        name: "Nigiri Set (10 miếng)",
        desc: "10 miếng nigiri hỗn hợp salmon, tuna, ebi",
        price: 250000,
        img: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=400&q=80",
      },
    ],
    Japanese: [
      {
        name: "Ramen Tonkotsu",
        desc: "Mì ramen nước dùng xương heo hầm 20 tiếng",
        price: 95000,
        img: "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&q=80",
      },
      {
        name: "Gyoza (6 cái)",
        desc: "Há cảo Nhật chiên vàng, nhân thịt và bắp cải",
        price: 65000,
        img: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&q=80",
      },
    ],
    Seafood: [
      {
        name: "Chíp Chíp Hấp Sả",
        desc: "Chíp chíp biển hấp sả ớt ngọt nước",
        price: 80000,
        img: "https://images.unsplash.com/photo-1534482421-64566f976cfa?w=400&q=80",
      },
      {
        name: "Mực Trứng Hấp Gừng",
        desc: "Mực trứng tươi sống hấp gừng ngọt thịt",
        price: 150000,
        img: "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=400&q=80",
      },
    ],
    Asian: [
      {
        name: "Pad Thai",
        desc: "Mì xào Thái Lan tôm, giá đỗ, trứng, đậu phụ",
        price: 85000,
        img: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400&q=80",
      },
    ],
    // ─── Chicken / Fried Chicken ─────────────────────────────────────────────
    Chicken: [
      {
        name: "Gà Rán Giòn (2 miếng)",
        desc: "Gà rán công thức 11 gia vị bí truyền",
        price: 69000,
        img: "https://images.unsplash.com/photo-1562802378-063ec186a863?w=400&q=80",
      },
      {
        name: "Gà Rán Sốt Cay Hàn Quốc",
        desc: "Gà rán sốt Gochujang cay ngọt đậm vị",
        price: 79000,
        img: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&q=80",
      },
    ],
    Gà: [
      {
        name: "Cánh Gà Nướng Mật Ong",
        desc: "6 cánh gà nướng mật ong tỏi thơm phức",
        price: 85000,
        img: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&q=80",
      },
    ],
    Fried: [
      {
        name: "Chả Giò Tôm Thịt (5 cái)",
        desc: "Chả giò vàng giòn nhân tôm thịt bún tàu",
        price: 55000,
        img: "https://images.unsplash.com/photo-1542528180-1c2803fa048c?w=400&q=80",
      },
    ],
    // ─── Healthy / Vegetarian / Chay ─────────────────────────────────────────
    Healthy: [
      {
        name: "Salad Bowl Gà Nướng",
        desc: "Rau xanh, gà nướng, hạt chia, sốt dầu olive",
        price: 89000,
        img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80",
      },
      {
        name: "Acai Bowl",
        desc: "Acai berry, granola, trái cây tươi, mật ong",
        price: 95000,
        img: "https://images.unsplash.com/photo-1558618047-f4e2f12ef6ab?w=400&q=80",
      },
      {
        name: "Smoothie Xanh Detox",
        desc: "Cải xoăn, dứa, gừng, dừa tươi – thanh lọc cơ thể",
        price: 65000,
        img: "https://images.unsplash.com/photo-1553530666-ba11a90a0868?w=400&q=80",
      },
    ],
    Salad: [
      {
        name: "Greek Salad",
        desc: "Feta, olive, cà chua bi, dưa leo, sốt balsamic",
        price: 75000,
        img: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80",
      },
    ],
    Vegetarian: [
      {
        name: "Cơm Chay Bình Dân",
        desc: "Cơm trắng, đậu hũ chiên, rau xào, dưa cải",
        price: 35000,
        img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
      },
      {
        name: "Phở Chay Nấm Hương",
        desc: "Phở nước dùng nấm, đậu hũ non, rau thơm",
        price: 40000,
        img: "https://images.unsplash.com/photo-1578020190125-f4f7c18bc9cb?w=400&q=80",
      },
    ],
    Chay: [
      {
        name: "Bún Chay Thập Cẩm",
        desc: "Bún nước dùng nấm, các loại rau củ, đậu hũ",
        price: 38000,
        img: "https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&q=80",
      },
    ],
    // ─── Bánh / Cake / Dessert ───────────────────────────────────────────────
    Bánh: [
      {
        name: "Bánh Mì Pate Thịt",
        desc: "Bánh mì Hội An giòn, nhân đầy ắp",
        price: 30000,
        img: "https://images.unsplash.com/photo-1600628421060-3b8f8b5f2c14?w=400&q=80",
      },
      {
        name: "Croissant Bơ",
        desc: "Bánh sừng trâu ngàn lớp giòn tan",
        price: 35000,
        img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80",
      },
      {
        name: "Bánh Tiramisu",
        desc: "Bánh phô mai Ý, lớp mascarpone mịn mượt",
        price: 55000,
        img: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&q=80",
      },
    ],
    "Tráng miệng": [
      {
        name: "Kem Dừa Đặc Biệt",
        desc: "Kem dừa tươi kèm thạch dừa giòn",
        price: 35000,
        img: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&q=80",
      },
      {
        name: "Chè Trôi Nước",
        desc: "Chè gừng trôi nước nhân đậu xanh truyền thống",
        price: 25000,
        img: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&q=80",
      },
    ],
    Dessert: [
      {
        name: "Bánh Flan Caramen",
        desc: "Flan mềm mịn với lớp caramel đắng ngọt",
        price: 25000,
        img: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80",
      },
      {
        name: "Mousse Chanh Leo",
        desc: "Mousse chanh leo chua ngọt mát lạnh",
        price: 45000,
        img: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&q=80",
      },
    ],
    // ─── Bia & Nước phụ ──────────────────────────────────────────────────────
    "Bia & Nước Ngọt": [
      {
        name: "Bia Tiger / Heineken",
        desc: "Bia ướp lạnh lon 330ml",
        price: 25000,
        img: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&q=80",
      },
      {
        name: "Nước Khoáng Dasani",
        desc: "Nước khoáng Dasani 500ml",
        price: 15000,
        img: "https://images.unsplash.com/photo-1502741338009-cac2772e18bc?w=400&q=80",
      },
    ],
  };

  const fallbackDishes = (categoryName: string) => [
    {
      name: `${categoryName} Đặc Biệt`,
      desc: `Món ngon đặc sản ${categoryName}`,
      price: 50000,
      img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80",
    },
    {
      name: `${categoryName} Truyền Thống`,
      desc: `Công thức truyền thống ${categoryName}`,
      price: 40000,
      img: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80",
    },
  ];

  for (let i = 0; i < categories.length; i++) {
    const categoryName = categories[i].name;
    const dishes = dishesMap[categoryName] || fallbackDishes(categoryName);

    for (let j = 0; j < dishes.length; j++) {
      await models.menuItem.create({
        data: {
          restaurantId: categories[i].restaurantId,
          categoryId: categories[i].id,
          name: dishes[j].name,
          description: dishes[j].desc,
          basePrice: new Prisma.Decimal(dishes[j].price),
          imageUrl: dishes[j].img,
          isAvailable: true,
        },
      });
    }
  }

  console.log("✅ Menu items seeded");
}