import {requireChatGPTUser} from '../chatgpt-auth';
import ReviewWorkspace from './review-workspace';
export const dynamic='force-dynamic';
export default async function Page(){await requireChatGPTUser('/ota-review');return <ReviewWorkspace/>;}
