import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { Vector3 } from 'three';

// Simple 3D skill representation
interface Skill3D {
  id: string;
  name: string;
  position: [number, number, number];
  color: string;
  size: number;
  type: 'user' | 'skill' | 'similar-user';
}

// Sample data - in real app this would come from backend
const sampleSkills: Skill3D[] = [
  // Center user (main user)
  { id: 'user-1', name: 'You', position: [0, 0, 0], color: '#667eea', size: 1.5, type: 'user' },

  // User skills (spheres around user)
  { id: 'skill-1', name: 'JavaScript', position: [3, 0, 0], color: '#f7df1e', size: 1.0, type: 'skill' },
  { id: 'skill-2', name: 'React', position: [0, 3, 0], color: '#61dafb', size: 1.2, type: 'skill' },
  { id: 'skill-3', name: 'Node.js', position: [-3, 0, 0], color: '#339933', size: 1.0, type: 'skill' },
  { id: 'skill-4', name: 'TypeScript', position: [0, 0, 3], color: '#3178c6', size: 0.8, type: 'skill' },
  { id: 'skill-5', name: 'Python', position: [2, 2, 2], color: '#3776ab', size: 0.9, type: 'skill' },

  // Similar users (cubes)
  { id: 'similar-1', name: 'Alice', position: [5, 1, 1], color: '#10b981', size: 1.0, type: 'similar-user' },
  { id: 'similar-2', name: 'Bob', position: [-2, -3, 2], color: '#f59e0b', size: 1.0, type: 'similar-user' },
  { id: 'similar-3', name: 'Carol', position: [1, -2, -3], color: '#ef4444', size: 1.0, type: 'similar-user' },
];

// Animated sphere component for skills and main user
const SkillSphere: React.FC<{
  position: [number, number, number];
  color: string;
  size: number;
  name: string;
  isMainUser?: boolean;
  onClick?: () => void;
}> = ({ position, color, size, name, isMainUser = false, onClick }) => {
  const meshRef = useRef<any>();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.1;

      // Main user rotates slowly
      if (isMainUser) {
        meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
      }
    }
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        position={position}
        scale={hovered ? size * 1.2 : size}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={hovered ? 0.9 : 0.7}
          emissive={color}
          emissiveIntensity={hovered ? 0.2 : 0.1}
        />
      </mesh>

      {/* Skill name label */}
      <Text
        position={[position[0], position[1] + size + 0.5, position[2]]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {name}
      </Text>
    </group>
  );
};

// Cube component for similar users
const SimilarUserCube: React.FC<{
  position: [number, number, number];
  color: string;
  size: number;
  name: string;
  onClick?: () => void;
}> = ({ position, color, size, name, onClick }) => {
  const meshRef = useRef<any>();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[1]) * 0.1;
      // Slow rotation
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.1;
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        position={position}
        scale={hovered ? size * 1.2 : size}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={hovered ? 0.9 : 0.7}
          emissive={color}
          emissiveIntensity={hovered ? 0.2 : 0.1}
        />
      </mesh>

      {/* User name label */}
      <Text
        position={[position[0], position[1] + size + 0.5, position[2]]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {name}
      </Text>
    </group>
  );
};

// Main 3D Skill Map component
const SkillMap3D: React.FC = () => {
  const [selectedSkill, setSelectedSkill] = useState<Skill3D | null>(null);

  const handleSkillClick = (skill: Skill3D) => {
    setSelectedSkill(skill);
    console.log('Selected skill:', skill);
  };

  return (
    <div className="w-full h-full bg-gradient-to-b from-gray-900 to-black">
      {/* Header */}
      <div className="absolute top-4 left-4 z-10 text-white">
        <h2 className="text-2xl font-bold mb-2">3D Skill Map</h2>
        <p className="text-gray-300 text-sm">
          Interactive visualization of your skills and progress
        </p>
      </div>

      {/* Selected skill info */}
      {selectedSkill && (
        <div className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 p-4 rounded-lg text-white">
          <h3 className="font-bold">{selectedSkill.name}</h3>
          <p className="text-sm text-gray-300">Type: {selectedSkill.type}</p>
          <button
            onClick={() => setSelectedSkill(null)}
            className="mt-2 text-xs bg-blue-600 px-2 py-1 rounded"
          >
            Close
          </button>
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [8, 8, 8], fov: 60 }}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Ambient lighting */}
        <ambientLight intensity={0.4} />

        {/* Directional lighting */}
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
        />

        {/* Point light for dramatic effect */}
        <pointLight position={[0, 10, 0]} intensity={0.5} color="#667eea" />

        {/* Render all skills */}
        {sampleSkills.map((skill) => {
          if (skill.type === 'similar-user') {
            return (
              <SimilarUserCube
                key={skill.id}
                position={skill.position}
                color={skill.color}
                size={skill.size}
                name={skill.name}
                onClick={() => handleSkillClick(skill)}
              />
            );
          } else {
            return (
              <SkillSphere
                key={skill.id}
                position={skill.position}
                color={skill.color}
                size={skill.size}
                name={skill.name}
                isMainUser={skill.type === 'user'}
                onClick={() => handleSkillClick(skill)}
              />
            );
          }
        })}

        {/* Grid floor for reference */}
        <gridHelper args={[20, 20, '#666666', '#333333']} />

        {/* Interactive camera controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={20}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-10 text-white text-xs opacity-70">
        <p>Mouse: Orbit • Wheel: Zoom • Click: Select skill</p>
      </div>
    </div>
  );
};

export default SkillMap3D;