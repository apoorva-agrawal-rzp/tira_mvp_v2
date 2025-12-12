import { type User } from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(phone: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: { phone: string; name?: string; email?: string }): Promise<User>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(phone: string): Promise<User | undefined> {
    return this.users.get(phone);
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.phone === phone,
    );
  }

  async createUser(insertUser: { phone: string; name?: string; email?: string }): Promise<User> {
    const user: User = { ...insertUser };
    this.users.set(insertUser.phone, user);
    return user;
  }
}

export const storage = new MemStorage();
