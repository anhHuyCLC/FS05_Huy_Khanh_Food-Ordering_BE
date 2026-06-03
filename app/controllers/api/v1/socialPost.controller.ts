import models from "@models";
import { NotFoundError, UnauthorizedError, BadRequestError } from "ts-rails";
import { ApiV1Controller } from "./apiV1.controller";
import { CreatePostValidator, CreateCommentValidator, CreateReportValidator } from "@validators/socialPost.validator";
import dayjs from "dayjs";

export class SocialPostControllerV1 extends ApiV1Controller {
  
  /**
   * Helper to get profile ID of currently logged in user
   */
  private async getProfileId(): Promise<string> {
    const userId = this.currentUser?.id;
    if (!userId) throw new UnauthorizedError("Cần đăng nhập để thực hiện thao tác này");

    let profile = await models.profile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      // Auto-create profile if missing
      const user = await models.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      if (!user) throw new NotFoundError("Tài khoản không tồn tại");

      profile = await models.profile.create({
        data: {
          userId,
          fullName: `${user.firstName} ${user.lastName}`.trim(),
        },
        select: { id: true },
      });
    }

    return profile.id;
  }

  private formatMediaUrls(mediaUrls: any): string[] {
    const urls = Array.isArray(mediaUrls) ? mediaUrls : [];
    const baseUrl = `${this.req.protocol}://${this.req.get('host')}`;
    return urls.map(url => {
      if (url && typeof url === "string" && url.startsWith("/uploads/")) {
        return `${baseUrl}${url}`;
      }
      return url;
    });
  }

  /**
   * GET /social-posts
   * Lists posts for community page
   */
  async index() {
    let profileId: string | null = null;
    try {
      profileId = await this.getProfileId();
    } catch {
      // Allow guest view
    }

    const tab = this.req.query.tab as string || "for_you";
    const { page, limit } = this.req.query as Record<string, string>;
    const take = parseInt(limit) || 10;
    const skip = (parseInt(page) - 1 || 0) * take;

    const whereClause: any = {};
    let orderClause: any = { createdAt: "desc" };

    if (tab === "following" && profileId) {
      const follows = await models.userFollow.findMany({
        where: { followerId: profileId },
        select: { followingId: true },
      });
      const followingIds = follows.map(f => f.followingId);
      whereClause.userId = { in: followingIds };
    } else if (tab === "trending") {
      orderClause = [
        { likesCount: "desc" },
        { createdAt: "desc" }
      ];
    }

    const [posts, total] = await Promise.all([
      models.socialPost.findMany({
        where: whereClause,
        orderBy: orderClause,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              badgeLevel: true,
            }
          },
          restaurant: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      }),
      models.socialPost.count({ where: whereClause }),
    ]);

    // Check likes & follows for current user
    let likedPostIds: Set<string> = new Set();
    let followedUserIds: Set<string> = new Set();

    if (profileId) {
      const postIds = posts.map(p => p.id);
      const likes = await models.postInteraction.findMany({
        where: {
          postId: { in: postIds },
          userId: profileId,
          interactionType: "LIKE",
        },
        select: { postId: true },
      });
      likedPostIds = new Set(likes.map(l => l.postId));

      const authorIds = posts.map(p => p.userId);
      const follows = await models.userFollow.findMany({
        where: {
          followerId: profileId,
          followingId: { in: authorIds },
        },
        select: { followingId: true },
      });
      followedUserIds = new Set(follows.map(f => f.followingId));
    }

    const result = posts.map(post => ({
      id: post.id,
      content: post.content,
      mediaUrls: this.formatMediaUrls(post.mediaUrls),
      taggedItems: post.taggedItems,
      likesCount: post.likesCount || 0,
      commentsCount: post.commentsCount || 0,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      user: {
        id: post.user.id,
        name: post.user.fullName,
        avatar: post.user.fullName.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2),
        avatarUrl: post.user.avatarUrl,
        badgeLevel: post.user.badgeLevel || "Newbie",
      },
      restaurant: post.restaurant ? {
        id: post.restaurant.id,
        name: post.restaurant.name,
      } : null,
      liked: likedPostIds.has(post.id),
      followed: followedUserIds.has(post.userId),
      isOwnPost: profileId ? post.userId === profileId : false,
    }));

    this.renderJson({
      data: result,
      meta: {
        total,
        page: parseInt(page) || 1,
        limit: take,
      }
    });
  }

  /**
   * POST /social-posts
   * Creates a new review post
   */
  async create() {
    const userId = this.currentUser?.id;
    if (!userId) throw new UnauthorizedError("Cần đăng nhập để thực hiện thao tác này");

    // Check if user is ADMIN
    const isAdmin = await models.userToRole.findFirst({
      where: {
        userId,
        role: { code: "ADMIN" }
      }
    });
    if (isAdmin) {
      throw new BadRequestError("Tài khoản Admin không được phép đăng bài review");
    }

    const profileId = await this.getProfileId();
    const data = await this.params(CreatePostValidator).permit(
      "content",
      "mediaUrls",
      "restaurantId",
      "taggedItems"
    );

    const post = await models.socialPost.create({
      data: {
        userId: profileId,
        content: data.content,
        mediaUrls: data.mediaUrls || [],
        restaurantId: data.restaurantId || null,
        taggedItems: data.taggedItems || [],
        likesCount: 0,
        commentsCount: 0,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          }
        },
        restaurant: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    this.renderJson({
      ...post,
      mediaUrls: this.formatMediaUrls(post.mediaUrls),
      liked: false,
      followed: false,
      isOwnPost: true,
      user: {
        id: post.user.id,
        name: post.user.fullName,
        avatarUrl: post.user.avatarUrl,
        avatar: post.user.fullName.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2),
      }
    }, 201);
  }

  /**
   * GET /social-posts/:id
   */
  async show() {
    let profileId: string | null = null;
    try {
      profileId = await this.getProfileId();
    } catch {}

    const post = await models.socialPost.findUnique({
      where: { id: this.req.params.id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            badgeLevel: true,
          }
        },
        restaurant: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (!post) throw new NotFoundError("Bài viết không tồn tại");

    let liked = false;
    let followed = false;

    if (profileId) {
      const like = await models.postInteraction.findUnique({
        where: {
          postId_userId_interactionType: {
            postId: post.id,
            userId: profileId,
            interactionType: "LIKE"
          }
        }
      });
      liked = !!like;

      const follow = await models.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId: profileId,
            followingId: post.userId
          }
        }
      });
      followed = !!follow;
    }

    this.renderJson({
      ...post,
      mediaUrls: this.formatMediaUrls(post.mediaUrls),
      liked,
      followed,
      isOwnPost: profileId ? post.userId === profileId : false,
      user: {
        id: post.user.id,
        name: post.user.fullName,
        avatarUrl: post.user.avatarUrl,
        avatar: post.user.fullName.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2),
        badgeLevel: post.user.badgeLevel || "Newbie",
      }
    });
  }

  /**
   * DELETE /social-posts/:id
   */
  async destroy() {
    const profileId = await this.getProfileId();
    const post = await models.socialPost.findUnique({
      where: { id: this.req.params.id },
      select: { userId: true },
    });

    if (!post) throw new NotFoundError("Bài viết không tồn tại");
    if (post.userId !== profileId) {
      throw new UnauthorizedError("Bạn không có quyền xóa bài viết của người khác");
    }

    await models.socialPost.delete({
      where: { id: this.req.params.id },
    });

    this.renderJson({
      message: "Đã xóa bài viết",
    });
  }

  /**
   * PATCH /social-posts/:id
   */
  async update() {
    const profileId = await this.getProfileId();
    const postId = this.req.params.id;

    const post = await models.socialPost.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    if (!post) throw new NotFoundError("Bài viết không tồn tại");
    if (post.userId !== profileId) {
      throw new UnauthorizedError("Bạn không có quyền chỉnh sửa bài viết của người khác");
    }

    const data = await this.params(CreatePostValidator).permit(
      "content",
      "mediaUrls",
      "restaurantId",
      "taggedItems"
    );

    const updatedPost = await models.socialPost.update({
      where: { id: postId },
      data: {
        content: data.content,
        mediaUrls: data.mediaUrls || [],
        restaurantId: data.restaurantId || null,
        taggedItems: data.taggedItems || [],
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          }
        },
        restaurant: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    const like = await models.postInteraction.findUnique({
      where: {
        postId_userId_interactionType: {
          postId: updatedPost.id,
          userId: profileId,
          interactionType: "LIKE"
        }
      }
    });
    const liked = !!like;

    this.renderJson({
      ...updatedPost,
      mediaUrls: this.formatMediaUrls(updatedPost.mediaUrls),
      liked,
      followed: false,
      isOwnPost: true,
      user: {
        id: updatedPost.user.id,
        name: updatedPost.user.fullName,
        avatarUrl: updatedPost.user.avatarUrl,
        avatar: updatedPost.user.fullName.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2),
      }
    });
  }

  /**
   * POST /social-posts/:id/like
   * Toggle like post
   */
  async toggleLike() {
    const profileId = await this.getProfileId();
    const postId = this.req.params.id;

    const post = await models.socialPost.findUnique({
      where: { id: postId },
      select: { id: true, likesCount: true },
    });

    if (!post) throw new NotFoundError("Bài viết không tồn tại");

    const existingLike = await models.postInteraction.findUnique({
      where: {
        postId_userId_interactionType: {
          postId,
          userId: profileId,
          interactionType: "LIKE"
        }
      }
    });

    let liked = false;
    let newLikesCount = post.likesCount || 0;

    if (existingLike) {
      await models.postInteraction.delete({
        where: { id: existingLike.id }
      });
      newLikesCount = Math.max(0, newLikesCount - 1);
      liked = false;
    } else {
      await models.postInteraction.create({
        data: {
          postId,
          userId: profileId,
          interactionType: "LIKE"
        }
      });
      newLikesCount += 1;
      liked = true;
    }

    await models.socialPost.update({
      where: { id: postId },
      data: { likesCount: newLikesCount }
    });

    this.renderJson({
      liked,
      likesCount: newLikesCount,
    });
  }

  /**
   * POST /social-posts/:id/comments
   * Add comment to post
   */
  async createComment() {
    const profileId = await this.getProfileId();
    const postId = this.req.params.id;
    const data = await this.params(CreateCommentValidator).permit("content");

    const post = await models.socialPost.findUnique({
      where: { id: postId },
      select: { id: true, commentsCount: true },
    });

    if (!post) throw new NotFoundError("Bài viết không tồn tại");

    const comment = await models.postComment.create({
      data: {
        postId,
        userId: profileId,
        content: data.content,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          }
        }
      }
    });

    const newCommentsCount = (post.commentsCount || 0) + 1;
    await models.socialPost.update({
      where: { id: postId },
      data: { commentsCount: newCommentsCount }
    });

    this.renderJson({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      user: {
        id: comment.user.id,
        name: comment.user.fullName,
        avatarUrl: comment.user.avatarUrl,
        avatar: comment.user.fullName.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2),
      }
    }, 201);
  }

  /**
   * GET /social-posts/:id/comments
   */
  async indexComments() {
    const postId = this.req.params.id;

    const comments = await models.postComment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          }
        }
      }
    });

    const result = comments.map(c => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      user: {
        id: c.user.id,
        name: c.user.fullName,
        avatarUrl: c.user.avatarUrl,
        avatar: c.user.fullName.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2),
      }
    }));

    this.renderJson(result);
  }

  /**
   * POST /social-posts/:id/share
   */
  async share() {
    const profileId = await this.getProfileId();
    const postId = this.req.params.id;

    const post = await models.socialPost.findUnique({
      where: { id: postId }
    });

    if (!post) throw new NotFoundError("Bài viết không tồn tại");

    // Check if share interaction already exists
    const existingShare = await models.postInteraction.findFirst({
      where: {
        postId,
        userId: profileId,
        interactionType: "SHARE"
      }
    });

    if (!existingShare) {
      await models.postInteraction.create({
        data: {
          postId,
          userId: profileId,
          interactionType: "SHARE"
        }
      });
    }

    this.renderJson({
      message: "Chia sẻ thành công",
    });
  }

  /**
   * POST /social-posts/users/:profileId/follow
   * Toggle follow a user
   */
  async toggleFollow() {
    const profileId = await this.getProfileId();
    const targetProfileId = this.req.params.profileId;

    if (profileId === targetProfileId) {
      throw new BadRequestError("Bạn không thể tự theo dõi chính mình");
    }

    const targetUser = await models.profile.findUnique({
      where: { id: targetProfileId }
    });

    if (!targetUser) throw new NotFoundError("Người dùng không tồn tại");

    const existingFollow = await models.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: profileId,
          followingId: targetProfileId
        }
      }
    });

    let followed = false;

    if (existingFollow) {
      await models.userFollow.delete({
        where: {
          followerId_followingId: {
            followerId: profileId,
            followingId: targetProfileId
          }
        }
      });
      followed = false;
    } else {
      await models.userFollow.create({
        data: {
          followerId: profileId,
          followingId: targetProfileId
        }
      });
      followed = true;
    }

    this.renderJson({
      followed,
    });
  }

  /**
   * GET /social-posts/users/:profileId/follow-status
   */
  async followStatus() {
    const profileId = await this.getProfileId();
    const targetProfileId = this.req.params.profileId;

    const follow = await models.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: profileId,
          followingId: targetProfileId
        }
      }
    });

    this.renderJson({
      followed: !!follow,
    });
  }

  /**
   * GET /social-posts/leaderboard
   * Get weekly active reviewers leaderboard
   */
  async leaderboard() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Query weekly activities using database-level groupBy
    const [postsGroup, restReviewsGroup, menuItemReviewsGroup] = await Promise.all([
      models.socialPost.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: sevenDaysAgo } },
        _count: { id: true },
        _sum: { likesCount: true },
      }),
      models.restaurantReview.groupBy({
        by: ["reviewerId"],
        where: { createdAt: { gte: sevenDaysAgo } },
        _count: { id: true },
      }),
      models.menuItemReview.groupBy({
        by: ["reviewerId"],
        where: { createdAt: { gte: sevenDaysAgo } },
        _count: { id: true },
      }),
    ]);

    // Gather active candidate user IDs
    const activeUserIds = Array.from(
      new Set([
        ...postsGroup.map((p) => p.userId),
        ...restReviewsGroup.map((r) => r.reviewerId),
        ...menuItemReviewsGroup.map((m) => m.reviewerId),
      ])
    );

    let profilesToFetch = activeUserIds;
    if (profilesToFetch.length === 0) {
      const topProfiles = await models.profile.findMany({
        where: {
          user: {
            roles: {
              none: {
                role: { code: "ADMIN" },
              },
            },
          },
        },
        take: 10,
        select: { id: true },
      });
      profilesToFetch = topProfiles.map((p) => p.id);
    }

    // Query follows only for the candidate profiles
    const followersGroup = await models.userFollow.groupBy({
      by: ["followingId"],
      where: { followingId: { in: profilesToFetch } },
      _count: { followerId: true },
    });

    // Score calculations
    const stats: Record<
      string,
      { posts: number; reviews: number; likes: number; followers: number }
    > = {};

    const getOrInitStats = (id: string) => {
      if (!stats[id]) {
        stats[id] = { posts: 0, reviews: 0, likes: 0, followers: 0 };
      }
      return stats[id];
    };

    postsGroup.forEach((p) => {
      const s = getOrInitStats(p.userId);
      s.posts += p._count.id;
      s.likes += p._sum.likesCount || 0;
    });

    restReviewsGroup.forEach((r) => {
      const s = getOrInitStats(r.reviewerId);
      s.reviews += r._count.id;
    });

    menuItemReviewsGroup.forEach((ir) => {
      const s = getOrInitStats(ir.reviewerId);
      s.reviews += ir._count.id;
    });

    followersGroup.forEach((uf) => {
      const s = getOrInitStats(uf.followingId);
      s.followers += uf._count.followerId;
    });

    const profiles = await models.profile.findMany({
      where: {
        id: { in: profilesToFetch },
        user: {
          roles: {
            none: {
              role: { code: "ADMIN" },
            },
          },
        },
      },
      select: { id: true, fullName: true, avatarUrl: true },
    });

    const result = profiles.map(profile => {
      const pStats = stats[profile.id] || { posts: 0, reviews: 0, likes: 0, followers: 0 };
      const score = (pStats.posts * 10) + (pStats.reviews * 5) + (pStats.likes * 2);

      return {
        id: profile.id,
        name: profile.fullName,
        avatar: profile.fullName.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2),
        avatarUrl: profile.avatarUrl,
        posts: pStats.posts,
        followers: pStats.followers >= 1000 ? `${(pStats.followers / 1000).toFixed(1)}K` : pStats.followers.toString(),
        score,
      };
    });

    // Sort by score
    result.sort((a, b) => b.score - a.score || b.posts - a.posts);

    // Add rank and rank badge
    const rankedResult = result.map((item, index) => {
      const rank = index + 1;
      let badge = rank.toString();
      if (rank === 1) badge = "🥇";
      else if (rank === 2) badge = "🥈";
      else if (rank === 3) badge = "🥉";

      return {
        ...item,
        rank,
        badge,
      };
    });

    this.renderJson(rankedResult);
  }

  /**
   * POST /social-posts/:id/report
   * Báo cáo bài viết vi phạm
   */
  async reportPost() {
    const postId = this.req.params.id;
    const profileId = await this.getProfileId();

    const data = await this.params(CreateReportValidator).permit("reason");

    // Kiểm tra bài viết tồn tại
    const post = await models.socialPost.findUnique({
      where: { id: postId }
    });

    if (!post) {
      throw new NotFoundError("Bài viết không tồn tại");
    }

    // Tạo báo cáo vi phạm
    const report = await models.postReport.create({
      data: {
        postId,
        reporterId: profileId,
        reason: data.reason,
        status: "PENDING"
      }
    });

    this.renderJson({
      message: "Đã gửi báo cáo bài viết thành công. Ban quản trị sẽ sớm xem xét.",
      data: report
    }, 201);
  }

  /**
   * GET /social-posts/stats
   * Get community stats: trending tags & posting streak
   */
  async getSidebarStats() {
    // 1. Trending tags
    const posts = await models.socialPost.findMany({
      select: { content: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const tagCounts: Record<string, number> = {};
    const hashtagRegex = /#([a-zA-Z0-9_vnVN_À-ỹ]+)/g;

    posts.forEach((p) => {
      if (!p.content) return;
      const matches = p.content.match(hashtagRegex);
      if (matches) {
        matches.forEach((tag) => {
          const normalized = tag.trim();
          tagCounts[normalized] = (tagCounts[normalized] || 0) + 1;
        });
      }
    });

    let trendingTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag)
      .slice(0, 8);

    // Fallbacks if database has no hashtags seeded yet
    const fallbackTags = ["#RamenNgon", "#BurgerRepublic", "#BuddhaBowl", "#TiramisuLovers", "#PhoGiaTruyen", "#BunBoHue", "#DessertDreams", "#HealthyEats"];
    if (trendingTags.length < 8) {
      const remaining = fallbackTags.filter(t => !trendingTags.includes(t));
      trendingTags = [...trendingTags, ...remaining].slice(0, 8);
    }

    // 2. Posting streak
    let streak = 0;
    const userId = this.currentUser?.id;
    if (userId) {
      const profile = await models.profile.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (profile) {
        const userPosts = await models.socialPost.findMany({
          where: { userId: profile.id },
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
        });

        if (userPosts.length > 0) {
          const dates = new Set<string>();
          userPosts.forEach(up => {
            dates.add(dayjs(up.createdAt).format("YYYY-MM-DD"));
          });

          let checkDate = dayjs();
          // If haven't posted today, check starting from yesterday
          if (!dates.has(checkDate.format("YYYY-MM-DD"))) {
            checkDate = checkDate.subtract(1, "day");
          }

          while (dates.has(checkDate.format("YYYY-MM-DD"))) {
            streak++;
            checkDate = checkDate.subtract(1, "day");
          }
        }
      }
    }

    this.renderJson({
      trendingTags,
      postingStreak: streak,
    });
  }
}
