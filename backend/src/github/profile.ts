import { ghGet } from "./client";

export interface UserProfile {
  login: string;
  name: string | null;
  avatar_url: string;
  public_repos: number;
  followers: number;
}

export async function getUserProfile(username: string): Promise<UserProfile> {
  return ghGet<UserProfile>(`/users/${username}`);
}

