import { useEffect, useRef, useCallback } from 'react';
import { Pedestrian, CarDirection } from '@/components/game/types';
import { Tile } from '@/types/game';
import { createPedestrianFromUser } from '@/components/game/pedestrianSystem';
import { findResidentialBuildings, findPedestrianDestinations } from '@/components/game/gridFinders';
import { findPathOnRoads, getDirectionOptions, getDirectionToTile } from '@/components/game/utils';
import { UserProfile } from '@/lib/userDatabase';

export function useUserCharacters(
  pedestriansRef: React.MutableRefObject<Pedestrian[]>,
  pedestrianIdRef: React.MutableRefObject<number>,
  grid: Tile[][] | null,
  gridSize: number,
  onCharacterSpawned?: (name: string, tileX: number, tileY: number) => void
) {
  const spawnedUserIdsRef = useRef<Set<string>>(new Set());

  const spawnUserCharacter = useCallback(async (
    user: UserProfile,
    showSpawnAnimation: boolean,
    fixedLocation?: { x: number; y: number }
  ) => {
    if (!grid || gridSize <= 0) {
      console.log('[Spawn] Failed: No grid or gridSize');
      return;
    }

    let tileX: number;
    let tileY: number;
    let direction: CarDirection = 'south';
    let destX: number;
    let destY: number;
    let path: { x: number; y: number }[] | null = null;

    if (fixedLocation) {
      tileX = fixedLocation.x;
      tileY = fixedLocation.y;
      destX = tileX;
      destY = tileY;
      console.log(`[Spawn] Using fixed location: (${tileX}, ${tileY}) for ${user.name}`);
      
      const destinations = findPedestrianDestinations(grid, gridSize);
      if (destinations.length > 0) {
        const dest = destinations[Math.floor(Math.random() * destinations.length)];
        destX = dest.x;
        destY = dest.y;
        
        const roadPath = findPathOnRoads(grid, gridSize, tileX, tileY, destX, destY);
        if (roadPath && roadPath.length > 0) {
          if (roadPath[0].x === tileX && roadPath[0].y === tileY) {
            path = roadPath;
          } else {
            path = [{ x: tileX, y: tileY }, ...roadPath];
          }
        }
      }
      
      if (!path || path.length === 0) {
        path = [{ x: tileX, y: tileY }];
      }
      
      if (path.length > 1) {
        const dir = getDirectionToTile(path[0].x, path[0].y, path[1].x, path[1].y);
        if (dir) direction = dir;
      }
    } else {
      const residentials = findResidentialBuildings(grid, gridSize);
      if (residentials.length === 0) {
        console.log('[Spawn] Failed: No residential buildings found');
        return;
      }

      const destinations = findPedestrianDestinations(grid, gridSize);
      if (destinations.length === 0) {
        console.log('[Spawn] Failed: No destinations found');
        return;
      }

      const home = residentials[Math.floor(Math.random() * residentials.length)];
      const dest = destinations[Math.floor(Math.random() * destinations.length)];
      destX = dest.x;
      destY = dest.y;

      path = findPathOnRoads(grid, gridSize, home.x, home.y, dest.x, dest.y);
      if (!path || path.length === 0) {
        console.log('[Spawn] Failed: No path found from home to destination');
        return;
      }

      const startTile = path[0];
      tileX = startTile.x;
      tileY = startTile.y;

      const options = getDirectionOptions(grid, gridSize, startTile.x, startTile.y);
      if (options.length === 0) {
        console.log('[Spawn] Failed: No direction options at start tile');
        return;
      }
      direction = options[Math.floor(Math.random() * options.length)];
    }

    if (!path || path.length === 0) {
      path = [{ x: tileX, y: tileY }];
    }

    console.log(`[Spawn] Creating pedestrian for ${user.name} at (${tileX}, ${tileY})`);

    const ped = createPedestrianFromUser(
      pedestrianIdRef.current++,
      user.id,
      user,
      tileX,
      tileY,
      destX ?? tileX,
      destY ?? tileY,
      'commercial',
      path,
      0,
      direction
    );

    if (!showSpawnAnimation) {
      ped.state = 'walking';
      ped.spawnProgress = undefined;
    }

    pedestriansRef.current.push(ped);
    spawnedUserIdsRef.current.add(user.id);
    
    console.log(`[Spawn] Character ${user.name} added to pedestrians array. Total pedestrians: ${pedestriansRef.current.length}, State: ${ped.state}, SpawnProgress: ${ped.spawnProgress}`);
    
    if (showSpawnAnimation && onCharacterSpawned) {
      console.log(`[Spawn] Calling onCharacterSpawned for ${user.name}`);
      onCharacterSpawned(user.name, ped.tileX, ped.tileY);
    }
  }, [grid, gridSize, pedestriansRef, pedestrianIdRef, onCharacterSpawned]);

  useEffect(() => {
    if (!grid || gridSize <= 0) return;

    const loadInitialUsers = async () => {
      try {
        const response = await fetch('/api/users/active');
        if (!response.ok) return;

        const users = await response.json();
        for (const user of users) {
          if (!spawnedUserIdsRef.current.has(user.id)) {
            await spawnUserCharacter(user, false);
          }
        }
      } catch (error) {
        console.error('Error loading initial users:', error);
      }
    };

    loadInitialUsers();

    const eventSource = new EventSource('/api/users/stream');
    
    eventSource.onopen = () => {
      console.log('SSE connection opened');
    };
    
    eventSource.onmessage = async (event) => {
      try {
        if (event.data === 'keepalive') return;
        console.log('[SSE] Message received:', event.data);
        const user: UserProfile = JSON.parse(event.data);
        console.log('[SSE] Parsed user:', user.name, 'ID:', user.id);
        if (!spawnedUserIdsRef.current.has(user.id)) {
          console.log('[SSE] Spawning new user character:', user.name);
          await spawnUserCharacter(user, true, { x: 19, y: 22 });
        } else {
          console.log('[SSE] User already spawned, skipping:', user.id);
        }
      } catch (error) {
        console.error('[SSE] Error processing event:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      console.log('SSE readyState:', eventSource.readyState);
    };

    return () => {
      eventSource.close();
    };
  }, [grid, gridSize, spawnUserCharacter]);
}


