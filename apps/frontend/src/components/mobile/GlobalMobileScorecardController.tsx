'use client';

import React, { useState, useEffect } from 'react';
import { RefereeScorecardModal } from './RefereeScorecardModal';

interface ScorepadDetail {
    matchId?: string;
    player1Name?: string;
    player2Name?: string;
    unitName?: string;
    matchCategory?: string;
    pointsToWinSet?: number;
    bestOfSets?: number;
}

export function GlobalMobileScorecardController() {
    const [isOpen, setIsOpen] = useState(false);
    const [scorepadData, setScorepadData] = useState<ScorepadDetail>({
        player1Name: 'Player 1',
        player2Name: 'Player 2',
        unitName: 'Table 1',
        matchCategory: "Men's Singles",
        pointsToWinSet: 11,
        bestOfSets: 3,
    });

    useEffect(() => {
        const handleOpen = (event: any) => {
            if (event.detail) {
                setScorepadData((prev) => ({
                    ...prev,
                    ...event.detail,
                }));
            }
            setIsOpen(true);
        };

        window.addEventListener('areena:open-scorepad', handleOpen);
        return () => {
            window.removeEventListener('areena:open-scorepad', handleOpen);
        };
    }, []);

    return (
        <RefereeScorecardModal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            matchId={scorepadData.matchId}
            player1Name={scorepadData.player1Name}
            player2Name={scorepadData.player2Name}
            unitName={scorepadData.unitName}
            matchCategory={scorepadData.matchCategory}
            pointsToWinSet={scorepadData.pointsToWinSet}
            bestOfSets={scorepadData.bestOfSets}
        />
    );
}
