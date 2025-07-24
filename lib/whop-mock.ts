// Mock Whop SDK implementation for development
// Replace this with actual Whop SDK when available

export interface MockWhopUser {
  id: string;
  email: string;
  username: string;
  profile_pic_url?: string;
}

export interface MockWhopMembership {
  id: string;
  user_id: string;
  company_id: string;
  plan_id: string;
  valid: boolean;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface MockWhopCompany {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface MockWhopPlan {
  id: string;
  company_id: string;
  name: string;
  price: number;
  currency: string;
}

class MockWhopAPI {
  private users: Map<string, MockWhopUser> = new Map();
  private memberships: Map<string, MockWhopMembership[]> = new Map();
  private companies: Map<string, MockWhopCompany> = new Map();
  private plans: Map<string, MockWhopPlan> = new Map();

  constructor(config: { token: string }) {
    // Initialize with some mock data
    this.initializeMockData();
  }

  private initializeMockData() {
    // Mock users
    const mockUser1: MockWhopUser = {
      id: 'user_1',
      email: 'creator@example.com',
      username: 'CreatorUser',
      profile_pic_url: null,
    };

    const mockUser2: MockWhopUser = {
      id: 'user_2', 
      email: 'customer@example.com',
      username: 'CustomerUser',
      profile_pic_url: null,
    };

    this.users.set('user_1', mockUser1);
    this.users.set('user_2', mockUser2);

    // Mock company
    const mockCompany: MockWhopCompany = {
      id: 'company_1',
      name: 'Test Creator Company',
      owner_id: 'user_1',
      created_at: new Date().toISOString(),
    };

    this.companies.set('company_1', mockCompany);

    // Mock plan
    const mockPlan: MockWhopPlan = {
      id: 'plan_1',
      company_id: 'company_1',
      name: 'Premium Subscription',
      price: 9.99,
      currency: 'USD',
    };

    this.plans.set('plan_1', mockPlan);

    // Mock membership
    const mockMembership: MockWhopMembership = {
      id: 'membership_1',
      user_id: 'user_2',
      company_id: 'company_1',
      plan_id: 'plan_1',
      valid: true,
      created_at: new Date().toISOString(),
      metadata: {
        source: 'challenge_reward',
        granted_at: new Date().toISOString(),
      },
    };

    this.memberships.set('user_2', [mockMembership]);
  }

  users = {
    retrieve: async ({ id }: { id: string }): Promise<MockWhopUser> => {
      const user = this.users.get(id);
      if (!user) {
        throw new Error(`User ${id} not found`);
      }
      return user;
    },
  };

  memberships = {
    list: async ({
      user_id,
      company_id,
      valid,
    }: {
      user_id?: string;
      company_id?: string;
      valid?: boolean;
    }) => {
      let results: MockWhopMembership[] = [];

      if (user_id) {
        results = this.memberships.get(user_id) || [];
      } else {
        // Get all memberships
        for (const userMemberships of this.memberships.values()) {
          results.push(...userMemberships);
        }
      }

      // Filter by company_id if provided
      if (company_id) {
        results = results.filter(m => m.company_id === company_id);
      }

      // Filter by valid status if provided
      if (valid !== undefined) {
        results = results.filter(m => m.valid === valid);
      }

      return { data: results };
    },

    create: async ({
      user_id,
      plan_id,
      company_id,
      metadata,
    }: {
      user_id: string;
      plan_id: string;
      company_id: string;
      metadata?: Record<string, any>;
    }): Promise<MockWhopMembership> => {
      const newMembership: MockWhopMembership = {
        id: `membership_${Date.now()}`,
        user_id,
        plan_id,
        company_id,
        valid: true,
        created_at: new Date().toISOString(),
        metadata,
      };

      const userMemberships = this.memberships.get(user_id) || [];
      userMemberships.push(newMembership);
      this.memberships.set(user_id, userMemberships);

      return newMembership;
    },
  };

  companies = {
    list: async ({ owner_id }: { owner_id: string }) => {
      const results = Array.from(this.companies.values()).filter(
        c => c.owner_id === owner_id
      );
      return { data: results };
    },
  };

  plans = {
    list: async ({ company_id }: { company_id: string }) => {
      const results = Array.from(this.plans.values()).filter(
        p => p.company_id === company_id
      );
      return { data: results };
    },
  };
}

export default MockWhopAPI; 