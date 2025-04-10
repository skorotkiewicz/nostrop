import { useEffect } from "react";
import { useStore } from "../store/useStore";
import { fetchPosts } from "../utils/nostr";

export function useNostr() {
  const { publicKey, privateKey, followedUsers, setFollowedUsers } = useStore();

  const followUser = async (pubkey) => {
    if (!publicKey || !privateKey) return;

    setFollowedUsers((prev) => {
      const updatedFollowedUsers = new Set(prev);
      updatedFollowedUsers.add(pubkey);
      localStorage.setItem(
        "followedUsers",
        JSON.stringify(Array.from(updatedFollowedUsers)),
      );
      return updatedFollowedUsers;
    });
  };

  const unfollowUser = async (pubkey) => {
    if (!publicKey || !privateKey) return;

    setFollowedUsers((prev) => {
      const updatedFollowedUsers = new Set(prev);
      updatedFollowedUsers.delete(pubkey);
      localStorage.setItem(
        "followedUsers",
        JSON.stringify(Array.from(updatedFollowedUsers)),
      );
      return updatedFollowedUsers;
    });
  };

  const isFollowed = (pubkey) => {
    if (!publicKey) return false;
    return followedUsers.has(pubkey);
  };

  const getFollowedUsers = () => {
    return Array.from(followedUsers);
  };

  const fetchFollowedPosts = async () => {
    if (!publicKey) return [];
    const followedUsersArray = getFollowedUsers();
    const followedPosts = await fetchPosts(followedUsersArray);

    return followedPosts;
  };

  useEffect(() => {
    const storedFollowedUsers = localStorage.getItem("followedUsers");
    if (storedFollowedUsers) {
      setFollowedUsers(new Set(JSON.parse(storedFollowedUsers)));
    }
  }, [setFollowedUsers]);

  return {
    followUser,
    unfollowUser,
    isFollowed,
    getFollowedUsers,
    fetchFollowedPosts,
  };
}
