import { useState, useMemo, useEffect } from "react";
import { Quaternion, TorusGeometry, Vector3 } from "three";
import { mergeBufferGeometries } from "three-stdlib";
import { useFrame } from "@react-three/fiber";
import { planePosition } from "./Airplane";
import { isHost, useMultiplayerState } from "playroomkit";

function randomPoint(scale) {
  return new Vector3(
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
    Math.random() * 2 - 1
  ).multiply(scale || new Vector3(1, 1, 1));
}

const TARGET_RAD = 0.125;

export function Targets() {
  const [targets, setTargets] = useMultiplayerState("targets", []);
  useEffect(() => {
    if (targets.length === 0 && isHost()) {
      const arr = [];
      for (let i = 0; i < 25; i++) {
        arr.push({
          center: randomPoint(new Vector3(4, 1, 4)).add(
            new Vector3(0, 2 + Math.random() * 2, 0)
          ),
          direction: randomPoint().normalize(),
          hit: false,
        });
      }

      setTargets(arr);
    }
  }, []);

  const geometry = useMemo(() => {
    let geo;

    targets.forEach((target) => {
      const torusGeo = new TorusGeometry(TARGET_RAD, 0.02, 8, 25);
      torusGeo.applyQuaternion(
        new Quaternion().setFromUnitVectors(
          new Vector3(0, 0, 1),
          target.direction
        )
      );
      torusGeo.translate(target.center.x, target.center.y, target.center.z);

      if (!geo) geo = torusGeo;
      else geo = mergeBufferGeometries([geo, torusGeo]);
    });

    return geo;
  }, [targets]);

  useFrame(() => {
    targets.forEach((target, i) => {
      const v = planePosition.clone().sub(target.center);
      const direction = new Vector3().copy(target.direction).normalize();
      const dist = direction.dot(v);
      const projected = planePosition
        .clone()
        .sub(direction.clone().multiplyScalar(dist));

      const hitDist = projected.distanceTo(new Vector3().copy(target.center));
      if (hitDist < TARGET_RAD) {
        target.hit = true;
      }
    });

    const atLeastOneHit = targets.find((target) => target.hit);
    if (atLeastOneHit) {
      setTargets(targets.filter((target) => !target.hit));
    }
  });

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial roughness={0.5} metalness={0.5} />
    </mesh>
  );
}
