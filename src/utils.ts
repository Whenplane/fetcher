export function isNearWan(now?: Date) {
	const d = now ? now : new Date();
	if(d.getUTCDay() === 5) {
		return d.getUTCHours() > 20;
	} else if(d.getUTCDay() === 6) {
		return d.getUTCHours() <= 11;
	} else {
		return false;
	}
}
