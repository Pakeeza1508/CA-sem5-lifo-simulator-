# Student Project Report: Computer Architecture Simulators

**Subject:** Computer Architecture  
**Date:** December 2025  
**Project Type:** Educational Simulation Tools  

---

## Table of Contents
1. [Introduction](#introduction)
2. [Project Overview](#project-overview)
3. [Project 1: LIFO Page Replacement Algorithm Simulator](#project-1-lifo-page-replacement-algorithm-simulator)
4. [Project 2: CPU Calculator (MIPS Assembly)](#project-2-cpu-calculator-mips-assembly)
5. [Technical Architecture](#technical-architecture)
6. [Features & Functionality](#features--functionality)
7. [Learning Outcomes](#learning-outcomes)
8. [Conclusion](#conclusion)

---

## Introduction

This project comprises two interactive educational simulators designed to help students understand fundamental concepts in Computer Architecture:

1. **LIFO Page Replacement Algorithm Simulator** - A web-based interactive tool for visualizing memory management
2. **CPU Calculator** - A MIPS assembly language implementation for page replacement simulation

These tools bridge the gap between theoretical knowledge and practical understanding by providing visual representations and step-by-step execution tracking.

---

## Project Overview

### Project Goals
- Demonstrate understanding of memory management algorithms
- Visualize page replacement strategies in operating systems
- Implement algorithms in both high-level (JavaScript) and low-level (MIPS Assembly) environments
- Create an intuitive learning platform for computer architecture students

### Technology Stack
- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Backend:** MIPS Assembly (SPIM Simulator compatible)
- **Visualization:** Chart.js for statistical analysis
- **Documentation:** PDF export capabilities
- **Accessibility:** Text narration support, keyboard navigation

---

## Project 1: LIFO Page Replacement Algorithm Simulator

### What is LIFO (Last In, First Out)?

LIFO is a page replacement algorithm used in **operating systems** to manage **virtual memory**. When the system needs to load a new page into a full memory (all frames occupied), it **removes the most recently added page** to make room for the incoming page.

#### Visual Analogy
Think of a stack of plates:
- You place plates on top of a stack
- When you need space, you remove the plate from the top (the one you just added)
- This is exactly how LIFO works with memory pages

### Memory Management Context

```
Virtual Memory System:
┌─────────────────────────────────────────┐
│        Virtual Address Space            │
│  (Divided into fixed-size pages)        │
├─────────────────────────────────────────┤
│                                         │
│  When a page is requested:              │
│  ├─ Check physical memory (frames)      │
│  ├─ If FOUND → Page Hit ✓               │
│  └─ If NOT FOUND → Page Fault           │
│       └─ Load from disk                 │
│       └─ Replace old page if full       │
│                                         │
└─────────────────────────────────────────┘
```

### How LIFO Algorithm Works

#### Step-by-Step Execution

**Step 1: Request a Page**
```
User requests page X from the CPU
```

**Step 2: Check Memory**
```
Is page X already in physical memory (frames)?
├─ YES → HIT (no action needed)
└─ NO  → FAULT (need to load)
```

**Step 3: Handle Fault**
```
IF memory has empty frames:
  ├─ Load page X into empty frame
  └─ Push page X onto the LIFO stack
  
ELSE (all frames full):
  ├─ Pop top page Y from stack (most recent)
  ├─ Replace frame with page X
  └─ Push page X onto stack
```

#### Algorithm Flowchart

```
                    START
                      │
                      ▼
            Request Page X
                      │
                      ▼
            ┌─ Is page in memory? ─┐
            │                       │
          YES                       NO
            │                       │
            ▼                       ▼
         HIT            ┌─ Frames available? ─┐
         (Skip)         │                       │
            │          YES                     NO
            │           │                       │
            │           ▼                       ▼
            │      Push to stack      Pop top page & replace
            │           │                      │
            └─────┬─────┘                      │
                  │                            │
                  ▼                            ▼
            Update Memory State       Update Memory State
                  │                            │
                  └───────┬────────────────────┘
                          │
                          ▼
                    Check next request
                          │
                          ▼
                        END
```

### Memory State Representation

In LIFO, memory is managed using a **Stack Data Structure**:

```
Request String: 7, 0, 1, 2, 0, 3, 0, 4
Frames Available: 3

Step 1: Request 7
┌─────┐
│  7  │ ← Top of Stack (Most Recent)
└─────┘
Status: FAULT | Hit Ratio: 0%

Step 2: Request 0
┌─────┐
│  0  │ ← Top
│  7  │
└─────┘
Status: FAULT | Hit Ratio: 0%

Step 3: Request 1
┌─────┐
│  1  │ ← Top
│  0  │
│  7  │
└─────┘
Status: FAULT | Hit Ratio: 0%

Step 4: Request 2 (Frames full!)
┌─────┐
│  2  │ ← Replaces 1 (popped from top)
│  0  │
│  7  │
└─────┘
Status: FAULT | Hit Ratio: 0%

Step 5: Request 0 (Already in memory!)
┌─────┐
│  2  │
│  0  │ ← Found here!
│  7  │
└─────┘
Status: HIT | Hit Ratio: 50%
```

### Complete Worked Example

| Step | Request | Frame 1 | Frame 2 | Frame 3 | Stack (Top→Bottom) | Status |
|------|---------|---------|---------|---------|-------------------|--------|
| 1    | 7       | 7       | -       | -       | [7]               | FAULT  |
| 2    | 0       | 7       | 0       | -       | [0, 7]            | FAULT  |
| 3    | 1       | 7       | 0       | 1       | [1, 0, 7]         | FAULT  |
| 4    | 2       | 7       | 0       | **2**   | [2, 0, 7]         | FAULT (replaced 1) |
| 5    | 0       | 7       | **0**   | 2       | [2, 0, 7]         | **HIT** |
| 6    | 3       | 7       | 0       | **3**   | [3, 0, 7]         | FAULT (replaced 2) |
| 7    | 0       | 7       | **0**   | 3       | [3, 0, 7]         | **HIT** |
| 8    | 4       | 7       | 0       | **4**   | [4, 0, 7]         | FAULT (replaced 3) |

**Results:**
- Total Faults: 6
- Total Hits: 2
- **Hit Ratio: 25% (2 hits out of 8 requests)**

### Performance Metrics

```
┌─────────────────────────────────────────┐
│   LIFO Algorithm Performance Analysis    │
├─────────────────────────────────────────┤
│                                         │
│ Hit Ratio = Hits / Total Requests       │
│           = 2 / 8 = 25%                 │
│                                         │
│ Page Fault Rate = Faults / Total        │
│                 = 6 / 8 = 75%           │
│                                         │
│ Time Efficiency: O(1) for stack ops     │
│ Space Efficiency: O(frames)             │
│                                         │
└─────────────────────────────────────────┘
```

### Advantages & Disadvantages

#### Advantages ✓
1. **Simple Implementation** - Easy to code and understand
2. **Low Overhead** - No complex calculations needed
3. **No Belady's Anomaly** - Follows stack inclusion property
4. **Fast Operations** - O(1) complexity for stack operations
5. **Deterministic** - Predictable replacement behavior

#### Disadvantages ✗
1. **Poor Hit Ratio** - Often performs worse than LRU or FIFO
2. **Memory Waste** - Old pages can get "stuck" in memory forever
3. **Ignores Locality** - Doesn't consider program access patterns
4. **Not Used in Practice** - Real OS use LRU, Clock, or 2nd-chance algorithms
5. **Belady's Paradox Vulnerability** - For other algorithms (not LIFO)

### Features of the Web-Based Simulator

#### 1. **Interactive Simulator Tab**
```
Input Section:
├─ Number of frames (1-10)
├─ Reference string (comma-separated pages)
├─ Example & Random generators
└─ Load, Reset, Start buttons

Execution Controls:
├─ Step-by-step navigation
├─ Automatic playback with speed control
├─ Pause/Resume functionality
└─ Progress tracking

Visualization:
├─ Live memory state display
├─ Stack representation
├─ Frame contents
└─ Hit/Fault indicators (colors)

Analysis:
├─ Total hits & faults count
├─ Hit ratio percentage
├─ Performance chart
└─ Operations log
```

#### 2. **Explanation Tab**
- Detailed algorithm explanation
- Step-by-step logic breakdown
- Worked examples with tables
- Advantages and disadvantages
- Interactive chatbot for Q&A
- Text-to-speech narration support

#### 3. **PDF Export**
- Generate detailed reports
- Include all statistics
- Export execution trace
- Professional formatting
- Downloadable for submission

#### 4. **Interactive Features**
- **Theme Selection** - Multiple color schemes
- **Keyboard Shortcuts** - Navigate with arrow keys
- **Narration** - Audio explanation of steps
- **Chart Visualization** - Hit/Fault distribution graphs
- **Dark Mode** - Eye-friendly display

---

## Project 2: CPU Calculator (MIPS Assembly)

### Overview

This is a **MIPS Assembly implementation** of the LIFO page replacement algorithm using the **SPIM simulator**. It demonstrates low-level programming concepts and how algorithms are executed at the machine level.

### What is MIPS Assembly?

MIPS (Microprocessor without Interlocked Pipeline Stages) is a **Reduced Instruction Set Computer (RISC)** architecture. It uses simple, orthogonal instructions that execute in predictable time.

### Program Structure

```
MIPS Program for LIFO Page Replacement
│
├─ Data Section (.data)
│  ├─ Memory allocation for page array
│  ├─ Frame storage (3 frames for simulation)
│  ├─ String prompts and output messages
│  └─ Loop counters and state variables
│
└─ Code Section (.text)
   ├─ Input Phase
   │  └─ Read number of pages
   │  └─ Read each page value
   │
   ├─ Simulation Phase
   │  ├─ Main loop through all pages
   │  ├─ Check for hit in frames
   │  ├─ Handle fault condition
   │  ├─ Manage stack (LIFO replacement)
   │  └─ Print current state
   │
   └─ Output Phase
      └─ Display total page faults
```

### MIPS Register Usage

```
Register Allocation:
┌──────────────────────────────────────────┐
│ $s0 | Current page array pointer         │
│ $s1 | Total number of pages (limit)      │
│ $s2 | Frame array pointer                │
│ $s3 | Stack size counter                 │
│ $s4 | Page fault counter                 │
│ $t0 | Loop counter (i)                   │
│ $t1 | Current page request               │
│ $t2 | Hit flag (1=found, 0=not found)    │
│ $t3 | Inner loop counter (j)             │
│ $t4 | Page value from frame              │
│ $t5 | Frame index for write              │
│ $t6 | Offset calculation                 │
│ $t7 | Print loop counter (k)             │
│ $t8, $t9 | Temporary calculations        │
│ $v0 | Syscall number & return value      │
│ $a0 | Syscall argument (address/value)   │
└──────────────────────────────────────────┘
```

### Execution Flow with Code

#### Phase 1: Input Collection

```mips
# Get total number of pages
msg_len:    .asciiz "Enter total number of pages: "
msg_val:    .asciiz "Enter page value: "

# Read input into $s1
li $v0, 4              # Syscall 4 = print string
la $a0, msg_len        # Load address of prompt
syscall

li $v0, 5              # Syscall 5 = read integer
syscall
move $s1, $v0          # Store input in $s1
```

**Flow Diagram:**
```
START
  │
  ├─ Print "Enter total number of pages: "
  │
  ├─ Read integer from user
  │
  ├─ Store in register $s1
  │
  ├─ Loop for each page:
  │  ├─ Print "Enter page value: "
  │  ├─ Read integer
  │  ├─ Store in pages array
  │  └─ Increment counter
  │
  └─ Proceed to simulation
```

#### Phase 2: LIFO Simulation Logic

```mips
# Main simulation loop
loop:
    beq $t0, $s1, exit_program    # Exit if i == Total

    lw $t1, 0($s0)               # Load current page request
    
    # CHECK FOR HIT IN FRAMES
    li $t2, 0                    # Hit flag = false
    li $t3, 0                    # j = 0
    
check_hit_loop:
    beq $t3, $s3, hit_check_done  # If j == stack size, stop
    
    # Calculate frame address
    sll $t8, $t3, 2              # offset = j * 4 (word size)
    add $t8, $s2, $t8            # address = frames_base + offset
    lw $t4, 0($t8)               # Load frame value
    
    beq $t4, $t1, is_hit         # If frame == request, HIT!
    
    addi $t3, $t3, 1             # j++
    j check_hit_loop

is_hit:
    li $t2, 1                    # Set hit flag = true

hit_check_done:
    beq $t2, 1, handle_hit       # If hit, jump to hit handler

# HANDLE MISS (Page Fault)
handle_miss:
    addi $s4, $s4, 1             # Increment fault counter
    
    # Check if frames have space
    li $t9, 3                    # Max frames
    bge $s3, $t9, replace_lifo   # If stack size >= 3, replace
    
    # If not full: append to stack
    move $t5, $s3                # Index = current stack size
    addi $s3, $s3, 1             # stack_size++
    j perform_write

replace_lifo:
    # All frames full: replace top (index 2)
    li $t5, 2                    # Frame index = 2 (top of stack)

perform_write:
    # Write new page to frame
    sll $t6, $t5, 2              # offset = index * 4
    add $t8, $s2, $t6            # address = frames + offset
    sw $t1, 0($t8)               # Write page to frame

print_stack:
    # Print current stack contents
    li $t7, 0                    # k = 0
    la $t8, frames               # Reset pointer
    
print_loop:
    beq $t7, $s3, print_end      # Exit when k == stack size
    li $v0, 1                    # Print integer
    lw $a0, 0($t8)               # Load frame value
    syscall
    
    addi $t8, $t8, 4             # Move to next frame
    addi $t7, $t7, 1             # k++
    j print_loop
```

### Detailed Logic Flow

```
For each page request:

┌─────────────────────────────────────────┐
│ 1. Load page request from input array   │
├─────────────────────────────────────────┤
│ 2. Initialize hit flag = false          │
├─────────────────────────────────────────┤
│ 3. Loop through all frames:             │
│    ├─ Compare current frame with page   │
│    ├─ If match found:                   │
│    │  └─ Set hit flag = true            │
│    │  └─ Exit search loop               │
│    └─ Continue to next frame            │
├─────────────────────────────────────────┤
│ 4. Check hit flag:                      │
│    ├─ If true → HIT                     │
│    │  └─ Print "HIT" + current stack    │
│    │  └─ No replacement needed          │
│    └─ If false → FAULT                  │
│       └─ Increment fault counter        │
│       └─ Check if frames have space:    │
│          ├─ Yes → Add to empty slot     │
│          ├─ No → Replace top (LIFO)     │
│          └─ Write new page to frame     │
├─────────────────────────────────────────┤
│ 5. Print updated stack state            │
├─────────────────────────────────────────┤
│ 6. Move to next page request            │
└─────────────────────────────────────────┘
```

### Memory Organization

```
Memory Layout in MIPS:

0x10000000 ┌─────────────────────────────────────┐
           │ .text (Code Section)                │
           │ - All instructions                  │
           │ - Program logic                     │
           │ - Syscalls                          │
           ├─────────────────────────────────────┤
0x10010000 │ .data (Data Section)                │
           │                                     │
           │ pages: .space 400  ◄── Input array  │
           │        Up to 100 pages (4 bytes ea) │
           │                                     │
           │ frames: .word -1, -1, -1            │
           │         (3 frames for simulation)   │
           │                                     │
           │ Strings & prompts                   │
           │                                     │
           ├─────────────────────────────────────┤
0x10020000 │ Stack (grows downward)              │
           │ - Local variables                   │
           │ - Return addresses                  │
           ├─────────────────────────────────────┤
0x10021000 │ Heap (grows upward)                 │
           │ - Dynamic allocation (if used)      │
           └─────────────────────────────────────┘
```

### Example Execution Trace

```
MIPS Console Output:

Enter total number of pages: 5
Enter page value: 7
Enter page value: 0
Enter page value: 1
Enter page value: 2
Enter page value: 0

===== SIMULATION STARTS =====

Request: 7 [MISS] Stack: [7]
Request: 0 [MISS] Stack: [0 7]
Request: 1 [MISS] Stack: [1 0 7]
Request: 2 [MISS] Stack: [2 0 7]     // Replaced 1 (top)
Request: 0 [HIT]  Stack: [2 0 7]

Total Page Faults: 4
```

### Key MIPS Concepts Demonstrated

1. **Data Structures**
   - Arrays (pages, frames)
   - Implicit stack in algorithm
   - Memory addressing

2. **Control Flow**
   - Conditional branching (beq, bge)
   - Loops (jump back with j)
   - Function-like structures

3. **Register Management**
   - Saved registers ($s0-$s7) for values
   - Temporary registers ($t0-$t9) for calculations
   - Argument registers ($a0) for syscalls
   - Return value register ($v0) for syscalls

4. **Memory Operations**
   - Load word (lw) from memory
   - Store word (sw) to memory
   - Address arithmetic with shifts (sll for *4)

5. **System Calls**
   - Syscall 4: Print string
   - Syscall 5: Read integer
   - Syscall 1: Print integer
   - Syscall 10: Exit program

---

## Technical Architecture

### System Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│              CA-Project Main Workspace                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  WEB-BASED SIMULATOR (JavaScript/HTML/CSS)            │ │
│  │                                                        │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │ Frontend Interface (index.html)                  │ │ │
│  │  │  ├─ Explanation Tab                              │ │ │
│  │  │  ├─ Simulator Tab                                │ │ │
│  │  │  ├─ Input Controls                               │ │ │
│  │  │  └─ Visualization Areas                          │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │                                                        │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │ Logic Engine (script.js)                         │ │ │
│  │  │  ├─ Algorithm simulation                         │ │ │
│  │  │  ├─ State management                            │ │ │
│  │  │  ├─ Event handling                              │ │ │
│  │  │  ├─ Visualization control                       │ │ │
│  │  │  └─ PDF generation                              │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │                                                        │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │ Styling (style.css)                              │ │ │
│  │  │  ├─ Responsive layout                            │ │ │
│  │  │  ├─ Color themes                                 │ │ │
│  │  │  ├─ Animations                                   │ │ │
│  │  │  └─ Accessibility features                       │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  LOW-LEVEL SIMULATOR (MIPS Assembly)                  │ │
│  │                                                        │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │ cpu-lator.txt (MIPS Source Code)                │ │ │
│  │  │  ├─ .data section (memory & strings)            │ │ │
│  │  │  └─ .text section (program logic)               │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │                     │                                  │ │
│  │                     ▼                                  │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │ SPIM Simulator (External Tool)                  │ │ │
│  │  │  ├─ Assembles MIPS code                         │ │ │
│  │  │  ├─ Simulates CPU execution                     │ │ │
│  │  │  ├─ Manages registers & memory                  │ │ │
│  │  │  └─ Handles I/O syscalls                        │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Algorithm Instance
(runs in both environments)
        │
        ├─ JavaScript Version
        │  └─ For learning & visualization
        │
        └─ MIPS Version
           └─ For low-level understanding
```

### File Organization

```
CA-Project/
│
├─ index.html              Main web interface
├─ script.js               JavaScript engine (1378 lines)
├─ style.css               UI styling
│
├─ cpu-lator.txt           MIPS Assembly source (186 lines)
│
├─ PROJECT_REPORT.md       This document
│
└─ LIFO-PAGE-REPLACEMENT-ALGO-SIMULATOR/
   └─ (Alternative/backup version)
```

---

## Features & Functionality

### 1. Web Simulator Features

#### A. Interactive Input
```javascript
// User can input:
- Number of frames (1-10)
- Reference string (manual or auto-generated)
- Example test cases
- Custom parameters
```

#### B. Visualization
```
Live Display:
├─ Memory frames [Frame 1][Frame 2][Frame 3]
├─ Stack representation [Top] → [Bottom]
├─ Current page request highlight
├─ Hit/Fault color coding (Green/Red)
└─ Progress indicators
```

#### C. Execution Controls
```
┌─ Load Data Button
├─ Reset Button
├─ Start/Stop Button
├─ Previous/Next Step
├─ Play/Pause Autoplay
├─ Speed Control (Slow/Normal/Fast)
└─ Export Report (PDF)
```

#### D. Analysis Tools
```
Metrics Displayed:
├─ Total Page Hits (Count)
├─ Total Page Faults (Count)
├─ Hit Ratio Percentage
├─ Execution Timeline Graph
├─ Operations Log Table
└─ Performance Statistics
```

#### E. Educational Features
```
├─ Narration (Text-to-Speech)
├─ Theme Selection
│  ├─ Default (Cyan)
│  ├─ Matrix (Green)
│  ├─ Sunset (Orange)
│  ├─ Neon (Purple/Magenta)
│  └─ Pastel (Purple/Pink)
│
├─ Keyboard Shortcuts
│  ├─ Arrow Keys: Navigate steps
│  ├─ Space: Play/Pause
│  ├─ R: Reset
│  └─ L: Load data
│
└─ AI Chatbot
   ├─ Answers algorithm questions
   ├─ Explains concepts
   ├─ Optional Gemini API integration
   └─ Offline fallback mode
```

### 2. MIPS Assembly Features

#### A. Input Handling
```mips
# Dynamic page count
# User-entered page values
# Stored in memory array
```

#### B. Algorithm Implementation
```mips
# Complete LIFO logic:
├─ Hit detection loop
├─ Fault handling
├─ LIFO replacement logic
├─ Stack management
└─ State tracking
```

#### C. Output Generation
```
Console Output:
├─ Current request number
├─ HIT or MISS status
├─ Live stack visualization
├─ Total fault count at end
└─ Execution trace
```

#### D. Registers & Memory Usage
```
Efficient resource allocation:
├─ 13 registers for state
├─ 2 memory arrays
├─ Multiple string constants
└─ O(n) time complexity
```

---

## Learning Outcomes

### Students Will Understand:

#### 1. **Memory Management Concepts**
- ✓ Virtual memory vs physical memory
- ✓ Page replacement necessity
- ✓ Frame allocation
- ✓ Page faults and hits

#### 2. **LIFO Algorithm**
- ✓ Stack-based replacement strategy
- ✓ Comparison with other algorithms (FIFO, LRU)
- ✓ Performance characteristics
- ✓ Real-world applicability (or lack thereof)

#### 3. **Data Structures**
- ✓ Stack implementation concepts
- ✓ Array-based storage
- ✓ Memory addressing
- ✓ Pointer arithmetic

#### 4. **Low-Level Programming**
- ✓ MIPS instruction set
- ✓ Register management
- ✓ Memory operations
- ✓ Control flow (branching, loops)
- ✓ System calls
- ✓ CPU cycle understanding

#### 5. **Visualization & Analysis**
- ✓ State representation
- ✓ Algorithm tracing
- ✓ Performance metrics
- ✓ Graph-based analysis
- ✓ Comparative performance

#### 6. **Software Engineering**
- ✓ Algorithm implementation
- ✓ User interface design
- ✓ Interactive visualization
- ✓ Documentation practices
- ✓ Testing & validation

### Practical Skills Developed
1. **Web Development** - HTML/CSS/JavaScript
2. **Assembly Programming** - MIPS language
3. **Debugging** - Trace execution, find issues
4. **Problem Solving** - Understand algorithm nuances
5. **Documentation** - Create technical reports
6. **Communication** - Explain complex concepts

---

## Conclusion

### Project Summary

This comprehensive project demonstrates a complete implementation of the **LIFO Page Replacement Algorithm** in two different contexts:

1. **High-Level Perspective** (Web Simulator)
   - Interactive, visual learning platform
   - Immediate feedback and visualization
   - Suitable for understanding conceptual level
   - Professional presentation and analysis tools

2. **Low-Level Perspective** (MIPS Assembly)
   - Machine-level implementation
   - Demonstrates hardware-software interaction
   - Shows actual CPU execution model
   - Teaches register and memory management

### Educational Value

✓ **Bridging Theory and Practice** - Students see the same algorithm at two abstraction levels
✓ **Interactive Learning** - Hands-on experimentation enhances understanding
✓ **Comprehensive Visualization** - Complex concepts become clear through graphics
✓ **Real-World Relevance** - Basis for understanding modern OS memory management
✓ **Professional Quality** - Production-ready UI and documentation

### Potential Extensions

For future enhancements:
- Implement additional algorithms (LRU, FIFO, Optimal Page Replacement)
- Comparative performance analysis across algorithms
- Network-based simulator (shared sessions)
- Mobile-responsive design improvements
- Video tutorials with algorithm walkthrough
- Benchmark testing suite
- Memory prediction algorithms

### References & Standards

- **MIPS Architecture**: MIPS R3000 Instruction Set
- **Operating Systems**: Virtual Memory Management (Silberschatz, Galvin)
- **Web Standards**: HTML5, CSS3, ES6 JavaScript
- **Simulation Tools**: SPIM, Chart.js
- **Educational Goals**: CS/IT curriculum standards

---

## Appendix: Technical Details

### A. Algorithm Complexity Analysis

```
Time Complexity:
  Input: O(n)           // n = number of page requests
  Simulation: O(n*m)    // m = number of frames
  Overall: O(n*m)

Space Complexity:
  Pages Array: O(n)     // n page requests
  Frames: O(m)          // m frames (constant, usually 3-10)
  Stack: O(m)           // implicit in frames
  Overall: O(n)
```

### B. Sample Test Cases

**Test Case 1 - Simple Sequence**
```
Frames: 3
Pages: 1, 2, 3, 4, 2, 1, 5, 3, 4
Expected Faults: 7
Expected Hits: 2
Hit Ratio: 22.2%
```

**Test Case 2 - Repetitive Pattern**
```
Frames: 3
Pages: 7, 0, 1, 2, 0, 3, 0, 4, 5, 3
Expected Faults: 8
Expected Hits: 2
Hit Ratio: 20%
```

**Test Case 3 - Working Set**
```
Frames: 3
Pages: 0, 1, 2, 0, 1, 2, 0, 1, 2
Expected Faults: 3
Expected Hits: 6
Hit Ratio: 66.7%
```

### C. Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Core UI | ✓      | ✓       | ✓      | ✓    |
| Canvas  | ✓      | ✓       | ✓      | ✓    |
| PDF     | ✓      | ✓       | ✓      | ✓    |
| Speech  | ✓      | ✓       | ✓      | ✓    |
| Charts  | ✓      | ✓       | ✓      | ✓    |

### D. System Requirements

**For Web Simulator:**
- Modern web browser (2020+)
- 10MB disk space
- 100MB RAM minimum
- Internet connection optional

**For MIPS Simulator:**
- SPIM simulator installed
- Text editor for .asm files
- Terminal/Command line access
- No special requirements

---

**Document Version:** 1.0  
**Last Updated:** December 2025  
**Status:** Complete Educational Project  
**License:** Educational Use

---

*This project is designed for educational purposes as part of a Computer Architecture course. It provides both theoretical understanding and practical implementation experience.*



// to push on github : git push -f gitsafe-backup main
