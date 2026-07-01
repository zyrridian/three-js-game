import { Entity } from './Entity';

export abstract class Enemy extends Entity {
    public isBird: boolean = false;
    public hp: number = 3;
    
    // Derived classes will implement the specific logic
}
