import React from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';

const StudyPageHeader = ({
    title,
    subtitle = '',
    visibleScopeLabel,
    roleLabel = '',
    centersLabel = '',
    recordCount = null,
    extraChips = [],
    onInfoClick,
    infoButtonLabel = 'Información de la vista',
}) => (
    <Paper
        elevation={0}
        sx={{
            p: { xs: 2, md: 2.5 },
            mb: 2,
            border: '1px solid #D9E2EC',
            borderRadius: 2,
            backgroundColor: '#FFFFFF',
        }}
    >
        <Stack spacing={1.5}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Box>
                    <Typography
                        variant="h5"
                        sx={{
                            color: '#1F2933',
                            fontSize: { xs: '1.25rem', sm: '1.45rem', md: '1.6rem' },
                            fontWeight: 800,
                            letterSpacing: 0,
                            lineHeight: 1.2,
                            mb: 0.5,
                        }}
                    >
                        {title}
                    </Typography>
                    {subtitle && (
                        <Typography variant="body2" sx={{ color: '#52616B', fontSize: '0.875rem', lineHeight: 1.4 }}>
                            {subtitle}
                        </Typography>
                    )}
                </Box>
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<InfoOutlined sx={{ fontSize: '1rem !important' }} />}
                    onClick={onInfoClick}
                    aria-label={infoButtonLabel}
                    sx={{
                        borderColor: '#D9E2EC',
                        color: '#52616B',
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        py: 0.5,
                        '&:hover': { borderColor: '#2F5D7C', color: '#1E3A5F', backgroundColor: '#F5F7FA' },
                    }}
                >
                    {infoButtonLabel}
                </Button>
            </Box>
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                <Chip
                    label={visibleScopeLabel}
                    size="small"
                    variant="outlined"
                    sx={{ borderColor: '#2F5D7C', color: '#1E3A5F', fontWeight: 700, fontSize: '0.75rem' }}
                />
                {roleLabel && (
                    <Chip label={roleLabel} size="small" variant="outlined" sx={{ fontSize: '0.75rem' }} />
                )}
                {centersLabel && (
                    <Chip label={`Centros: ${centersLabel}`} size="small" variant="outlined" sx={{ fontSize: '0.75rem' }} />
                )}
                {extraChips.map((chipLabel) => (
                    <Chip key={chipLabel} label={chipLabel} size="small" variant="outlined" sx={{ fontSize: '0.75rem' }} />
                ))}
                {typeof recordCount === 'number' && (
                    <Chip
                        label={`${recordCount} registros`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem' }}
                    />
                )}
            </Stack>
        </Stack>
    </Paper>
);

StudyPageHeader.propTypes = {
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    visibleScopeLabel: PropTypes.string.isRequired,
    roleLabel: PropTypes.string,
    centersLabel: PropTypes.string,
    recordCount: PropTypes.number,
    extraChips: PropTypes.arrayOf(PropTypes.string),
    onInfoClick: PropTypes.func.isRequired,
    infoButtonLabel: PropTypes.string,
};

export default StudyPageHeader;
